import React, {useEffect, useRef, useState} from 'react';
import * as echarts from 'echarts';
import {useData} from '../hooks/useData';
import worldJson from '../assets/world.json';
import * as Prm from './params';

// Ensure the world map is registered even when this page loads first (no prior components ran)
try {
    const getMap = (echarts as any).getMap?.('world');
    if (!getMap) {
        // Normalize feature name property so echarts can match series data by name
        try {
            (worldJson as any).features?.forEach((f: any) => {
                if (f?.properties) {
                    f.properties.name = f.properties.name || f.properties.NAME || f.properties.admin || f.properties.NAME_LONG;
                }
            });
        } catch {}
        echarts.registerMap('world', worldJson as any);
    }
} catch (e) {
    // Fallback: attempt to register without checking
    try {
        (worldJson as any).features?.forEach((f: any) => {
            if (f?.properties) {
                f.properties.name = f.properties.name || f.properties.NAME || f.properties.admin || f.properties.NAME_LONG;
            }
        });
    } catch {}
    try { echarts.registerMap('world', worldJson as any); } catch {}
}

// Helper to resolve public URLs in both dev and prod (GitHub Pages base)
const baseUrl = (import.meta as any).env?.BASE_URL || '/';
const buildPublicUrl = (p: string) => `${String(baseUrl).replace(/\/+$/, '')}/${p.replace(/^\/+/, '')}`;


interface TradeData {
    year: string;
    country: string;
    value_bln_USD: number;
}

interface ProductTradeData {
    year: string;
    product_chapter: string;
    imports_trln_USD: string;
    exports_trln_USD: string;
}

interface ProductChapterMapping {
    product_chapter: string;
    description: string;
}

// struct for the two imports/exports bar chart
interface TopTradeData {
    year: string;
    product_chapter: string;
    value_trln_USD: string;
    quantity_mln_metric_tons: string;
}

// struct for sankey diagram
interface SankeyNode {
  name: string;
}

interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

console.log('WorldTradeMapAnimated mounted');

export const WorldTradeMapAnimated: React.FC = () => {
    // Ref for the main WorldMap Chart
    const chartRef = useRef<HTMLDivElement>(null);
    // Ref for the two bar charts for imports/exports
    const importsChartRef = useRef<HTMLDivElement>(null);
    const exportsChartRef = useRef<HTMLDivElement>(null);
    // Ref for sankey diagram
    const [sankeyChartRef] = useState(useRef<HTMLDivElement>(null));
    // Ref for the line plot
    const linePlotRef = useRef<HTMLDivElement>(null);

    const { data: allData, loading: deficitLoading, error: allDataError } = useData<TradeData[]>('absolute_deficit_all_years.csv');
    const { data: rawChapterMappings, loading: chaptersLoading, error: chaptersError } = useData<any[]>('interactive/prod_chap_to_description.csv');
    const [year, setYear] = useState<string>('2023');
    const [playing, setPlaying] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<string>('');
    const [productData, setProductData] = useState<Record<string, Record<string, ProductTradeData[]>>>({});
    const [loadingProductData, setLoadingProductData] = useState(false);
    const [productChapters, setProductChapters] = useState<ProductChapterMapping[]>([]);
    const [currentView, setCurrentView] = useState<'total' | 'product'>('total');
    const [availableCountries, setAvailableCountries] = useState<string[]>([]);

    // Add state for bar charts (top trade data)
    const [topImportsData, setTopImportsData] = useState<Record<string, TopTradeData[]>>({});
    const [topExportsData, setTopExportsData] = useState<Record<string, TopTradeData[]>>({});
    const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
    const [loadingTopData, setLoadingTopData] = useState(false);
    const [uiError, setUiError] = useState<string | null>(null);

    // State for sankey diagram (top import/export countries)
    const [topImportSources, setTopImportSources] = useState<Record<string, any[]>>({});
    const [topExportSources, setTopExportSources] = useState<Record<string, any[]>>({});

    // State for lineplot
    const [linePlotData, setLinePlotData] = useState<{ year: string, imports: number, exports: number }[]>([]);

    const loadLinePlotData = async (countryCode: string, productChapter: string) => {
        if (!countryCode || !productChapter) {
            setLinePlotData([]);
            return;
        }

        try {
            const response = await fetch(buildPublicUrl(`data/interactive/${countryCode}/surplus_deficit_by_chapter.csv`));
            if (!response.ok) throw new Error('Failed to fetch data');

            const text = await response.text();
            const lines = text.split('\n').filter(line => line.trim() !== '');
            const headers = lines[0].split(',').map(h => h.trim());

            const data = lines.slice(1)
                .map(line => {
                    const values = line.split(',');
                    const entry: any = {};
                    headers.forEach((header, i) => {
                        entry[header] = values[i];
                    });
                    return entry as ProductTradeData;
                })
                .filter(item => item.product_chapter === productChapter)
                .map(item => ({
                    year: item.year,
                    imports: (parseFloat(item.imports_trln_USD || '0') * 1000), // Convert to billions
                    exports: (parseFloat(item.exports_trln_USD || '0') * 1000)  // Convert to billions
                }))
                .sort((a, b) => parseInt(a.year) - parseInt(b.year));

            setLinePlotData(data);
        } catch (error) {
            console.error('Error loading line plot data:', error);
            setLinePlotData([]);
        }
    };

    const parseAndAggregateTradeSources = (text: string, filterYear?: string, filterProduct?: string) => {
        const lines = text.split('\n').filter(line => line.trim() !== '');
        if (lines.length < 2) return [];

        const headers = lines[0].split(',').map(h => h.trim());
        const data: any[] = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
                .map(v => v.trim().replace(/^"(.*)"$/, '$1'));

            if (values.length !== headers.length) continue;

            const entry: any = {};
            headers.forEach((header, index) => {
                entry[header] = values[index];
            });
            if (filterYear && String(entry.year).trim() !== String(filterYear).trim()) continue;
            if (filterProduct && String(entry.product_chapter).trim() !== String(filterProduct).trim()) continue;
            if (String(entry.year).trim() === String(filterYear).trim() &&
                String(entry.product_chapter).trim() === String(filterProduct).trim()) {
                console.log('%c命中！', 'color: green; font-weight: bold;', entry, filterYear, filterProduct);
            } else {
                console.log('未命中', entry, filterYear, filterProduct);
            }
            data.push(entry);
        }

        // Aggregate by exporter/importer
        const aggregated: Record<string, number> = {};
        data.forEach(item => {
            const key = item.exporter || item.importer;
            if (!key || key === 'Other') return; // Skip 'Other' and empty keys

            const value = parseFloat(item.value_trln_USD) || 0;
            aggregated[key] = (aggregated[key] || 0) + value;
        });

        // Convert to array, sort, and limit to top 6
        return Object.entries(aggregated)
            .map(([country, value]) => ({
                country,
                value: Math.max(0, value) // Ensure non-negative
            }))
            .sort((a, b) => b.value - a.value);
    };

    const parseCSVTopTradeBarChart = (text: string): TopTradeData[] => {
        const lines = text.split('\n').filter(line => line.trim() !== '');
        if (lines.length < 2) return []; // Need at least header + one row

        const headers = lines[0].split(',').map(h => h.trim());
        const data: TopTradeData[] = [];

        for (let i = 1; i < lines.length; i++) {
            // Handle quoted values that might contain commas
            const values = lines[i].split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
                .map(v => v.trim().replace(/^"(.*)"$/, '$1'));

            if (values.length !== headers.length) continue;

            const entry: any = {};
            headers.forEach((header, index) => {
                entry[header] = values[index];
            });

            data.push(entry as TopTradeData);
        }

        return data;
    };

    // Update the loadTopTradeData function for TopTradeBarChart
    const loadTopTradeData = async (countryCode: string) => {
        if (!countryCode) return;

        setLoadingTopData(true);
        try {
            // First verify the file exists
            const importsUrl = buildPublicUrl(`data/interactive/${countryCode}/top_import_chapters.csv`);
            const exportsUrl = buildPublicUrl(`data/interactive/${countryCode}/top_export_chapters.csv`);
            const importSourcesUrl = buildPublicUrl(`data/interactive/${countryCode}/top_import_srcs.csv`);
            const exportSourceUrl = buildPublicUrl(`data/interactive/${countryCode}/top_export_dsts.csv`)

            console.log(`Attempting to fetch from: ${importsUrl}`);

            const [importsRes, exportsRes, importSourcesRes, exportSourcesRes] = await Promise.all([
                fetch(importsUrl),
                fetch(exportsUrl),
                fetch(importSourcesUrl),
                fetch(exportSourceUrl)
            ]);

            // Check if we got HTML instead of CSV
            const importsText = await importsRes.text();
            const exportsText = await exportsRes.text();
            const importSourcesText = await importSourcesRes.text();
            const exportSourcesText = await exportSourcesRes.text();

            if (importsText.trim().startsWith('<!DOCTYPE') || exportsText.trim().startsWith('<!DOCTYPE')) {
                throw new Error('Received HTML instead of CSV data');
            }

            // Process bar chart data
            const importsData = parseCSVTopTradeBarChart(importsText);
            const exportsData = parseCSVTopTradeBarChart(exportsText);

            // Process sankey data
            const importSources = parseAndAggregateTradeSources(importSourcesText, year, selectedProduct);
            const exportSources = parseAndAggregateTradeSources(exportSourcesText, year, selectedProduct);

            console.log('Successfully parsed:', {
                imports: importsData,
                exports: exportsData,
                importSources: importSources,
                exportSources: exportSources,
            });

            setTopImportsData(prev => ({
                ...prev,
                [countryCode]: importsData
            }));

            setTopExportsData(prev => ({
                ...prev,
                [countryCode]: exportsData
            }));

            setTopImportSources(prev => ({ 
                ...prev,
                [countryCode]: importSources
            }));

            setTopExportSources(prev => ({
                ...prev,
                [countryCode]: exportSources
            }));

        } catch (error) {
            console.error(`Failed to load top trade data for ${countryCode}:`, error);
            setUiError(`Failed to load top trade data for ${countryCode}.`);
            // Set empty data to prevent errors
            setTopImportsData(prev => ({
                ...prev,
                [countryCode]: []
            }));
            setTopExportsData(prev => ({
                ...prev,
                [countryCode]: []
            }));
            setTopImportSources(prev => ({ 
                ...prev,
                [countryCode]: []
            }));
            setTopExportSources(prev => ({
                ...prev,
                [countryCode]: []
            }));
        } finally {
            setLoadingTopData(false);
        }
    };

    const getChapterDescription = (chapterCode: string) => {
        const chapter = productChapters.find(c => c.product_chapter === chapterCode);
        return chapter ? chapter.description : `Chapter ${chapterCode}`;
    };

    // lineplot useEffects
    useEffect(() => {
        if (selectedCountry && selectedProduct) {
            loadLinePlotData(selectedCountry, selectedProduct);
        }
    }, [selectedCountry, selectedProduct]);

    useEffect(() => {
        if (!linePlotRef.current || linePlotData.length === 0) return;

        const chart = echarts.init(linePlotRef.current);
        const desc = getChapterDescription(selectedProduct);
        const first3Words = desc.split(' ').slice(0, 3).join(' ');
        const option = {
            title: {
                text: `Trade Over Time - ${first3Words}`,
                left: 'center',
                textStyle: {
                    fontSize: 16, // Consistent sub-chart title size
                    color: '#222'
                }
            },
            tooltip: {
                trigger: 'axis',
                formatter: (params: any) => {
                    const year = params[0].axisValue;
                    const imports = params[0].data;
                    const exports = params[1].data;
                    return `Year: ${year}<br/>` + // Values are now in billions
                        `Imports: ${imports.toFixed(1)} Billion USD<br/>` +
                        `Exports: ${exports.toFixed(1)} Billion USD`;
                }
            },
            legend: {
                data: ['Imports', 'Exports'],
                bottom: 0,
                textStyle: {
                    fontSize: Prm.label_fontsz // 14px
                }
            },
            xAxis: {
                type: 'category',
                data: linePlotData.map(item => item.year),
                name: 'Year',
                nameLocation: 'middle',
                nameGap: 25,
                nameTextStyle: {
                    fontSize: Prm.title_fontsz // 16px
                },
                axisLabel: {
                    fontSize: Prm.label_fontsz // 14px
                }
            },
            yAxis: {
                type: 'value',
                name: 'Value (Billion USD)', // Updated axis title
                nameLocation: 'middle',
                nameGap: 43,
                nameTextStyle: { fontSize: Prm.title_fontsz }, // 16px
                axisLabel: {
                    formatter: '{value}',
                    fontSize: Prm.label_fontsz // 14px
                }
            },
            series: [
                {
                    name: 'Imports',
                    type: 'line',
                    data: linePlotData.map(item => item.imports),
                    itemStyle: { color: Prm.map_red },
                    lineStyle: { 
                        width: 3,
                        color: Prm.map_red 
                    }
                },
                {
                    name: 'Exports',
                    type: 'line',
                    data: linePlotData.map(item => item.exports),
                    itemStyle: { color: Prm.map_blue },
                    lineStyle: { 
                        width: 3,
                        color: Prm.map_blue
                    }
                }
            ]
        };

        chart.setOption(option);

        return () => {
            chart.dispose();
        };
    }, [linePlotData, selectedCountry, selectedProduct]);

    useEffect(() => {
        if (!sankeyChartRef.current || !selectedCountry || !selectedProduct) return;

        // 读取对应国家的top_import_srcs.csv和top_export_dsts.csv
    const importSourcesUrl = buildPublicUrl(`data/interactive/${selectedCountry}/top_import_srcs.csv`);
    const exportSourcesUrl = buildPublicUrl(`data/interactive/${selectedCountry}/top_export_dsts.csv`);

        const sankeyChart = echarts.init(sankeyChartRef.current);

        Promise.all([
            fetch(importSourcesUrl).then(res => res.ok ? res.text() : ''),
            fetch(exportSourcesUrl).then(res => res.ok ? res.text() : '')
        ]).then(([importSourcesText, exportSourcesText]) => {
            // 只筛选当前year和selectedProduct的数据
            const importSourcesAll = parseAndAggregateTradeSources(importSourcesText, year, selectedProduct);
            const exportSourcesAll = parseAndAggregateTradeSources(exportSourcesText, year, selectedProduct);
            const importSources = importSourcesAll.slice(0, 6);
            const exportSources = exportSourcesAll.slice(0, 6);
            const countryName = codeToName[selectedCountry] || selectedCountry;
            const chapterDesc = getChapterDescription(selectedProduct);
            const firstWordOfChapter = chapterDesc.split(' ')[0];

            // Prepare nodes - need unique names and proper indices
            const nodes: SankeyNode[] = [
                ...importSources.map(src => ({
                    name: `${codeToName[src.country] || src.country} (Import)`
                })),
                { name: countryName },
                ...exportSources.map(src => ({
                    name: `${codeToName[src.country] || src.country} (Export)`
                }))
            ];

            // Prepare links using节点名称（string），而不是索引（number）
            const links: SankeyLink[] = [
                ...importSources.map(src => ({
                    source: `${codeToName[src.country] || src.country} (Import)`,
                    target: countryName,
                    value: src.value * 1000 // Convert to billions
                })),
                ...exportSources.map(src => ({
                    source: countryName,
                    target: `${codeToName[src.country] || src.country} (Export)` ,
                    value: src.value * 1000 // Convert to billions
                }))
            ];

            const option = {
                title: {
                    // text: `Trade Partners - ${countryName} (${year})`,
                    text: `Trade Partners: ${firstWordOfChapter} - ${countryName} (${year})`,
                    left: 'center',
                    top: 10,
                    textStyle: {
                        fontSize: 20, // Unified sub-chart title size
                        color: '#222'
                    }
                },
                tooltip: {
                    trigger: 'item',
                    formatter: (params: any) => {
                        if (params.dataType === 'edge') {
                            // const source = nodes[params.data.source].name.replace(' (Import)', '').replace(' (Export)', '');
                            // const target = nodes[params.data.target].name.replace(' (Import)', '').replace(' (Export)', '');
                            // return `${source} → ${target}<br/>Value: ${params.data.value.toFixed(6)} Billion USD`;
                            // params.data.source and params.data.target are the string names of the nodes
                            const sourceName = (params.data.source as string).replace(' (Import)', '').replace(' (Export)', '');
                            const targetName = (params.data.target as string).replace(' (Import)', '').replace(' (Export)', '');
                            // params.data.value is already in billions from the link preparation
                            const valueInBillions = (params.data.value as number);
                            return `${sourceName} → ${targetName}<br/>Value: ${valueInBillions.toFixed(1)} Billion USD`;
                        }
                        return params.name.replace(' (Import)', '').replace(' (Export)', '');
                    }
                },
                series: [{
                    type: 'sankey',
                    layout: 'none',
                    data: nodes,
                    links: links,
                    emphasis: {
                        focus: 'adjacency'
                    },
                    nodeAlign: 'left',
                    orient: 'horizontal',
                    left: '25%',
                    top: '18%',
                    right: '15%', // Adjusted right to give more space for labels
                    bottom: '10%',
                    levels: [{
                        depth: 0,
                        itemStyle: {
                            color: Prm.map_red // Import sources
                        },
                        lineStyle: {
                            color: 'source',
                            opacity: 0.6
                        }
                    }, {
                        depth: 1,
                        itemStyle: {
                            color: '#BDBDBD' // Neutral color for the selected country (middle node)
                        },
                        lineStyle: {
                            color: 'source',
                            opacity: 0.6
                        }
                    }, {
                        depth: 2, // Added level for export destinations
                        itemStyle: {
                            color: Prm.map_blue // Export destinations
                        },
                        lineStyle: {
                            color: 'source',
                            opacity: 0.6
                        }
                    }],
                    lineStyle: {
                        curveness: 0.5,
                        // Link colors will be inherited from source node due to 'levels' config
                    },
                    label: {
                        position: 'left',
                        formatter: (params: any) => {
                            return params.name.replace(' (Import)', '').replace(' (Export)', '');
                        },
                        fontSize: 12 // Reduced font size for Sankey node labels
                    },
                    nodeWidth: 20,
                    nodeGap: 10,
                }]
            };

            sankeyChart.setOption(option);
        });

        return () => {
            sankeyChart.dispose();
        };
    }, [selectedCountry, selectedProduct, year]);

    // Load top trade data when country is selected for the two bar charts
    useEffect(() => {
        if (selectedCountry && currentView === 'total') {
            loadTopTradeData(selectedCountry);
        }
    }, [selectedCountry, currentView]);

    // Then update the getYearData function
    const getYearData = (data: TopTradeData[], year: string) => {
        if (!data || !Array.isArray(data)) return [];

        return data
            .filter(item => item?.year?.toString()?.trim() === year?.toString()?.trim())
            .sort((a, b) => {
                const valA = parseFloat(a.value_trln_USD) || 0;
                const valB = parseFloat(b.value_trln_USD) || 0;
                return valB - valA; // Descending order
            });
    };

    useEffect(() => {
        if (!importsChartRef.current || !exportsChartRef.current) return;

        const importsChart = echarts.init(importsChartRef.current);
        const exportsChart = echarts.init(exportsChartRef.current);

        const renderChart = (chart: echarts.ECharts, data: TopTradeData[], title: string) => {
            const yearData = getYearData(data, year);
            // Determine bar color based on title (import or export)
            const barColor = title.toLowerCase().includes('import') ? Prm.map_red : Prm.map_blue;

            chart.setOption({
                title: {
                    text: title,
                    left: 'center',
                    top: 10,
                    textStyle: {
                        fontSize: 20, // Unified sub-chart title size to match Trade Partners
                        color: '#222'
                    }
                },
                tooltip: {
                    trigger: 'axis',
                    axisPointer: { type: 'shadow' },
                    formatter: function(params: any) {
                        let content = `<b>${params[0].name}</b><br/>`;
                        params.forEach((item: any) => {
                            // item.value is now in billions
                            const valueInBillions = (item.value as number);
                            content += `${item.seriesName || 'Value'}: ${valueInBillions.toFixed(1)} Billion USD<br/>`;
                        });
                        return content;
                    }
                },
                grid: {
                    left: 20,
                    right: 60,
                    top: 60,
                    bottom: 40
                },
                xAxis: {
                    type: 'value',
                    name: 'Value (Billion USD)', // Updated axis title
                    nameLocation: 'middle',
                    nameGap: 25, // Increased gap for better readability
                    nameTextStyle: { fontSize: Prm.title_fontsz }, // 16px
                    axisLabel: {
                        fontSize: Prm.label_fontsz, // 14px
                        color: '#333',
                        formatter: '{value}'
                    }
                },
                yAxis: {
                    type: 'category',
                    data: yearData.map(item => item.product_chapter),
                    nameTextStyle: {
                        fontWeight: 'bold',
                        fontSize: Prm.label_fontsz
                    },
                    axisLabel: { show: false },
                    axisTick: { show: false },
                    axisLine: { show: false }
                },
                series: [{
                    type: 'bar',
                    // Convert value to billions and carry the category name with each item
                    itemStyle: { color: barColor },
                    data: yearData.map(item => ({
                        value: (parseFloat(item.value_trln_USD) || 0) * 1000,
                        name: item.product_chapter
                    })),
                    label: {
                        show: true,
                        // Start by placing inside; we'll move it outside when it doesn't fit via labelLayout
                        position: 'insideRight',
                        fontSize: Prm.label_fontsz,
                        fontWeight: 'bold',
                        color: '#000',
                        // Subtle outline for readability when label sits over colored bars
                        textBorderColor: 'rgba(255,255,255,0.6)',
                        textBorderWidth: 2,
                        formatter: (params: any) => {
                            const name = params.name as string;
                            const val = Number(params.value) || 0;
                            const truncated = name && name.length > 50 ? name.slice(0, 50) + '...' : name;
                            return `${truncated} (${val.toFixed(1)})`;
                        }
                    },
                    // Dynamically position label inside the bar if it fits, otherwise place it to the right
                    labelLayout: (params: any) => {
                        try {
                            const rect = params.rect;        // bar rect
                            const labelRect = params.labelRect; // label rect
                            if (rect && labelRect) {
                                const padding = 6;
                                const fits = (labelRect.width + padding * 2) <= rect.width;
                                if (fits) {
                                    // Keep insideRight; no change needed
                                    return { x: Math.min(rect.x + rect.width - padding - labelRect.width, rect.x + rect.width - padding), align: 'left' };
                                } else {
                                    // Move label to the right of the bar
                                    return { x: rect.x + rect.width + 6, align: 'left', verticalAlign: 'middle' };
                                }
                            }
                        } catch {}
                        // Fallback: place to the right
                        return { align: 'left' } as any;
                    }
                }]
            });
        };

        if (selectedCountry) {
            renderChart(
                importsChart,
                topImportsData[selectedCountry] || [],
                `Top Import Categories - ${codeToName[selectedCountry] || selectedCountry} (${year})`
            );
            renderChart(
                exportsChart,
                topExportsData[selectedCountry] || [],
                `Top Export Categories - ${codeToName[selectedCountry] || selectedCountry} (${year})`
            );
        } else {
            // Clear charts when no country selected
            importsChart.setOption({ series: [{ data: [] }] });
            exportsChart.setOption({ series: [{ data: [] }] });
        }

        return () => {
            importsChart.dispose();
            exportsChart.dispose();
        };
    }, [selectedCountry, topImportsData, topExportsData, year]);


    // Update your existing map click handler to set the selected country
    const handleMapClick = (params: any) => {
        (async () => {
            const clickedName: string | undefined = params?.data?.name || params?.name;
            if (!clickedName) return;

            const countryFeature = (worldJson as any).features?.find((f: any) => {
                const nm = f?.properties?.name || f?.properties?.NAME;
                return typeof nm === 'string' && nm.toLowerCase() === clickedName.toLowerCase();
            });

            if (!countryFeature || !countryFeature.properties?.ISO_A3) return;

            const countryCode = countryFeature.properties.ISO_A3;
            console.log(countryCode)
            setSelectedCountry(countryCode);

            // Always load top trade data when a country is selected
            await loadTopTradeData(countryCode);

            if (currentView === 'product') {
                await loadProductData(countryCode);
            }
        })();
    };

    // 页面加载时获取 available_countries.json
    useEffect(() => {
        fetch(buildPublicUrl('data/interactive/available_countries.json'))
            .then(res => {
                if (!res.ok) throw new Error('Failed to load available countries');
                return res.json();
            })
            .then(setAvailableCountries)
            .catch(() => setUiError('Could not load available countries list.'));
    }, []);

    // 处理章节映射
    useEffect(() => {
        if (!rawChapterMappings || rawChapterMappings.length === 0) {
            setProductChapters([]); // Ensure it's empty if no data or loading
            return;
        }
        const processedChapters: ProductChapterMapping[] = [];
        rawChapterMappings.forEach(row => {
            // Assuming 'useData' parses CSV into objects with keys matching CSV headers
            const chapterCode = row.product_chapter; // Use direct property access
            const chapterDesc = row.description;   // Use direct property access

            if (chapterCode && chapterDesc) {
                processedChapters.push({
                    product_chapter: String(chapterCode).trim(),
                    description: String(chapterDesc).trim()
                });
            } else {
                console.warn('Skipping row due to missing product_chapter or description:', row);
            }
        });
        processedChapters.sort((a, b) => a.product_chapter.localeCompare(b.product_chapter));
        setProductChapters(processedChapters);
    }, [rawChapterMappings]);

    const years = React.useMemo(() => {
        if (!allData) return [];
        const set = new Set<string>();
        allData.forEach(item => set.add(item.year));
        return Array.from(set).sort((a, b) => parseInt(a) - parseInt(b));
    }, [allData]);

    const loadProductData = async (countryCode: string) => {
        if (!countryCode) return;
        setLoadingProductData(true);
        try {
            if (productData[countryCode]?.[selectedProduct]) {
                setLoadingProductData(false);
                return;
            }

            const response = await fetch(buildPublicUrl(`data/interactive/${countryCode}/surplus_deficit_by_chapter.csv`));
            if (!response.ok) {
                // 文件不存在，写入空数据
                setProductData(prev => ({
                    ...prev,
                    [countryCode]: {
                        ...(prev[countryCode] || {}),
                        [selectedProduct]: []
                    }
                }));
                return;
            }
            const text = await response.text();
            const lines = text.split('\n');
            const headers = lines[0].split(',');

            const data: ProductTradeData[] = lines.slice(1).map(line => {
                const values = line.split(',');
                const entry: any = {};
                headers.forEach((header, i) => {
                    entry[header] = values[i];
                });
                return entry as ProductTradeData;
            });

            // Organize data by product chapter
            const productChapterData: Record<string, ProductTradeData[]> = {};
            data.forEach(item => {
                if (!productChapterData[item.product_chapter]) {
                    productChapterData[item.product_chapter] = [];
                }
                productChapterData[item.product_chapter].push(item);
            });

            setProductData(prev => ({
                ...prev,
                [countryCode]: {
                    ...(prev[countryCode] || {}),
                    ...productChapterData
                }
            }));
        } catch (error) {
            // 加载失败也写入空数据
            setProductData(prev => ({
                ...prev,
                [countryCode]: {
                    ...(prev[countryCode] || {}),
                    [selectedProduct]: []
                }
            }));
            console.error(`Failed to load data for ${countryCode}:`, error);
        } finally {
            setLoadingProductData(false);
        }
    };

    // 只请求有数据国家
    useEffect(() => {
        if (currentView === 'product' && allData && selectedProduct && availableCountries.length > 0) {
            availableCountries.forEach(code => {
                if (!productData[code]?.[selectedProduct]) {
                    loadProductData(code);
                }
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentView, selectedProduct, allData, availableCountries]);

    // 设置初始年份为最新年份
    useEffect(() => {
        if (years.length > 0) {
            setYear(years[years.length - 1]);  // 设置为最后一年（最新年份）
        }
    }, [years]);

    // 动画年份切换
    useEffect(() => {
        if (!playing || years.length === 0) return;
        const idx = years.indexOf(year);
        if (idx === -1) return;
        const timer = setTimeout(() => {
            setYear(years[(idx + 1) % years.length]);
        }, 1200);
        return () => clearTimeout(timer);
    }, [playing, year, years]);

    // 判断所有国家的该产品数据是否都已加载
    const allProductDataLoaded = React.useMemo(() => {
        if (!allData || !selectedProduct) return false;
        if (currentView === 'product' && availableCountries.length > 0) {
            return availableCountries.every(code => productData[code]?.[selectedProduct]);
        } else {
            const countryCodes = Array.from(new Set(allData.map(d => d.country)));
            return countryCodes.every(code => productData[code]?.[selectedProduct]);
        }
    }, [allData, selectedProduct, productData, currentView, availableCountries]);

    // 章节描述映射
    const descriptionToChapter = React.useMemo(() => {
        const map: Record<string, string> = {};
        productChapters.forEach(item => {
            map[item.description] = item.product_chapter;
        });
        return map;
    }, [productChapters]);

    // 生成codeToName映射
    const codeToName: Record<string, string> = React.useMemo(() => {
        const map: Record<string, string> = {};
        worldJson.features.forEach(f => {
            if (f.properties?.ISO_A3 && f.properties?.NAME) {
                map[f.properties.ISO_A3] = f.properties.NAME;
            }
        });
        return map;
    }, []);

    // 国家名称匹配
        const matchCountryName = (countryCode: string, countryName: string): string => {
            if (codeToName[countryCode]) return codeToName[countryCode];
            if (Prm.countryCodeToName[countryCode]) return Prm.countryCodeToName[countryCode];
            if (Prm.countryNameAlias[countryName]) return Prm.countryNameAlias[countryName];
            const normalizedInput = countryName.toLowerCase().trim();
            const possibleMatches = Object.values(codeToName).filter(name =>
                name.toLowerCase().includes(normalizedInput) || normalizedInput.includes(name.toLowerCase())
            );
            return possibleMatches.length === 1 ? possibleMatches[0] : countryName;
        };

    // 获取国家贸易数据
        const getTradeData = (countryCode: string, countryName: string) => {
            if (currentView === 'total') {
            const item = allData?.find(d => String(d.year) === String(year) && d.country === countryCode);
                return {
                    name: matchCountryName(countryCode, countryName),
                    value: item ? Number(item.value_bln_USD) || 0 : 0
                };
            } else {
                const countryProductData = productData[countryCode]?.[selectedProduct];
            console.log('getTradeData', { countryCode, countryName, year, countryProductData });
                if (!countryProductData) {
                    return {
                        name: matchCountryName(countryCode, countryName),
                        value: 0,
                        imports: 0,
                        exports: 0
                    };
                }
            // 强制字符串比较
            const yearData = countryProductData.find(d => String(d.year) === String(year));
            console.log('yearData', { year, yearType: typeof year, yearData, allYears: countryProductData.map(d => d.year) });
                if (!yearData) {
                    return {
                        name: matchCountryName(countryCode, countryName),
                        value: 0,
                        imports: 0,
                        exports: 0
                    };
                }
            const imports = parseFloat(yearData.imports_trln_USD || '0') * 1000;
            const exports = parseFloat(yearData.exports_trln_USD || '0') * 1000;
                const balance = exports - imports;
                return {
                    name: matchCountryName(countryCode, countryName),
                    value: balance,
                    imports,
                    exports
                };
            }
        };

    // 地图数据
    const mapData = React.useMemo(() => {
        if (currentView === 'product' && availableCountries.length > 0) {
            return availableCountries
                .map(code => {
                    const name = codeToName[code] || code;
                    return getTradeData(code, name);
                })
                .filter(item => item !== null) as any[];
        } else {
        const countryCodes = new Set<string>();
            allData?.forEach(item => countryCodes.add(item.country));
            return Array.from(countryCodes)
            .map(code => {
                const name = codeToName[code] || code;
                return getTradeData(code, name);
            })
            .filter(item => item !== null) as any[];
        }
    }, [currentView, availableCountries, allData, selectedProduct, productData, productChapters, chaptersLoading, year]);

        const values = mapData.map(item => item.value).filter(v => typeof v === 'number' && !isNaN(v));
            const minValue = values.length ? Math.min(...values) : 0;
            const maxValue = values.length ? Math.max(...values) : 0;
            const maxRange = Math.max(Math.abs(minValue), Math.abs(maxValue), 1);

        const option = {
            backgroundColor: '#fff',
            tooltip: {
                trigger: 'item',
                formatter: (params: any) => {
          const value = params.value || 0;
          return `${params.name}<br/>Trade ${value >= 0 ? 'Surplus' : 'Deficit'}: ${value.toFixed(2)} Billion USD`;
                }
            },
            visualMap: {
                orient: 'vertical',
                right: 8,
                top: 'middle',
                min: -maxRange,
                max: maxRange,
                text: ['Surplus', 'Deficit'],
                realtime: false,
                calculable: true,
                inRange: { color: [Prm.map_red, '#ffffff', Prm.map_blue] }
            },
            // Use a geo component with boundingCoords to crop polar regions and reduce vertical whitespace
            geo: {
                map: 'world',
                roam: false,
                top: 0,
                bottom: 0,
                left: 0,
                right: 40, // leave room for the vertical legend
                layoutCenter: ['50%', '50%'],
                layoutSize: '135%', // slightly larger to better fill height
                // Crop the map to exclude extreme polar regions which cause extra whitespace
                // [lng, lat] pairs for bottom-left and top-right corners
                boundingCoords: [
                    [-170, -55], // bottom-left (exclude Antarctica)
                    [170, 80]    // top-right (limit far north)
                ],
                itemStyle: {
                    borderColor: '#aaa',
                    borderWidth: 0.5
                }
            },
            series: [{
        name: 'Trade Balance',
                type: 'map',
                geoIndex: 0,
                roam: false,
        emphasis: { 
            label: { show: true },
            itemStyle: {
                areaColor: '#FFFACD' // Milder yellow for hover
            }
        },
        data: mapData
      }]
    };

    useEffect(() => {
        console.log('WorldTradeMapAnimated: useEffect', chartRef.current, allData);
        console.log('WorldTradeMapAnimated: option', option);
        if ((option as any).series && (option as any).series[0] && (option as any).series[0].data) {
            console.log('WorldTradeMapAnimated: option.series[0].data', (option as any).series[0].data);
        }
        if (chartRef.current) {
            const chart = echarts.init(chartRef.current);
            console.log('WorldTradeMapAnimated: setOption', option);
            chart.setOption(option);
            console.log('WorldTradeMapAnimated: setOption 完成');
            chart.on('click', handleMapClick);

            const handleResize = () => {
                chart.resize();
            };
            window.addEventListener('resize', handleResize);

            // Resize after initial layout to ensure full height usage
            requestAnimationFrame(() => chart.resize());

            // Observe container size changes (more reliable than window resize)
            let ro: ResizeObserver | null = null;
            try {
                ro = new ResizeObserver(() => chart.resize());
                if (chartRef.current) ro.observe(chartRef.current);
            } catch {}

            return () => {
                window.removeEventListener('resize', handleResize);
                if (ro) {
                    try { ro.disconnect(); } catch {}
                }
                chart.dispose();
            };
        }
    }, [option, allData, chartRef]);

    if (
        deficitLoading || 
        chaptersLoading || 
        (currentView === 'product' && !allProductDataLoaded)
    ) {
        return <div style={{display:'grid',placeItems:'center',height:'100%'}}>Loading...</div>;
    }

    return (
        <div style={{
            width: '100%',
            height: '100%',
            display: 'grid',
            gridTemplateRows: 'minmax(0, 0.6fr) minmax(0, 0.4fr)',
            gap: '12px',
            padding: '12px',
            boxSizing: 'border-box',
            overflow: 'hidden'
        }}>
            {(allDataError || chaptersError) && (
                <div style={{
                    position:'absolute',
                    top: 8,
                    left:'50%',
                    transform:'translateX(-50%)',
                    background:'#fff3cd',
                    color:'#664d03',
                    border:'1px solid #ffecb5',
                    padding:'8px 12px',
                    borderRadius:6,
                    zIndex:1000
                }}>
                    {allDataError ? 'Failed to load base data. ' : ''}
                    {chaptersError ? 'Failed to load product chapters.' : ''}
                </div>
            )}
            {/* Top Section */}
            <div style={{ display: 'flex', gap: '12px', minHeight: 0, alignItems: 'stretch' }}>
                {/* Left Panel (responsive width) */}
                <div style={{ flex: '0 0 clamp(260px, 28vw, 420px)', minWidth: 240, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    {/* Controls */}
                    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {/* Timeline section */}
                        <div>
                            <div style={{ marginBottom: '8px', fontSize: '18px', color: '#666' }}>
                                Select the Year
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <span style={{ marginRight: '10px', fontWeight: 'bold', minWidth: '40px' }}>1995</span>
                                <input
                                    type="range"
                                    min={0}
                                    max={years.length - 1}
                                    value={years.indexOf(year)}
                                    onChange={e => setYear(years[Number(e.target.value)])}
                                    style={{ flex: 1 }}
                                />
                                <span style={{ marginLeft: '10px', fontWeight: 'bold', minWidth: '40px' }}>{year}</span>
                            </div>
                        </div>

                        {/* Product selection section */}
                        <div>
                            <div style={{ marginBottom: '8px', fontSize: '18px', color: '#666' }}>
                                Choose a Product Category
                            </div>
                            <select 
                                value={selectedProduct}
                                onChange={(e) => {
                                    setSelectedProduct(e.target.value);
                                    if (e.target.value === "") {
                                        setCurrentView('total');
                                    } else {
                                        setCurrentView('product');
                                    }
                                }}
                                style={{ 
                                    width: '100%',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    border: '1px solid #ddd',
                                    fontSize: '14px',
                                    backgroundColor: '#fff'
                                }}
                            >
                                <option value="">-- Show Total Trade Balance --</option>
                                {productChapters
                                    .slice()
                                    .sort((a, b) => a.description.localeCompare(b.description))
                                    .map(chapter => (
                                    <option key={chapter.product_chapter} value={chapter.product_chapter}>
                                        {chapter.description}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Line Plot fills remaining height */}
                    <div
                        ref={linePlotRef}
                        style={{
                            flex: 1,
                            backgroundColor: '#fff',
                            borderRadius: '8px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            padding: '10px',
                            minHeight: 0
                        }}
                    />
                </div>
                
                {/* World Map fills remaining width */}
                <div style={{ flex: 1, minWidth: 0, position: 'relative', minHeight: '300px' }}>
                    <div
                        ref={chartRef}
                        style={{
                            position: 'absolute',
                            inset: 0,
                            backgroundColor: '#fff',
                            borderRadius: '8px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}
                    />
                    {/* Non-intrusive overlay label instead of chart title */}
                    <div style={{ position: 'absolute', top: 8, left: 12, color: '#666', fontSize: '18px', pointerEvents: 'none' }}>
                        Select a Country
                    </div>
                </div>
            </div>

            {/* Bottom Section */}
            <div style={{
                display: 'flex',
                minHeight: 0,
                gap: '12px'
            }}>
                <div
                    ref={importsChartRef}
                    style={{
                        flex: 1,
                        backgroundColor: '#fff',
                        borderRadius: '8px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        height: '100%'
                    }}
                />
                <div
                    ref={sankeyChartRef}
                    style={{
                        flex: 1,
                        backgroundColor: '#fff',
                        borderRadius: '8px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        minWidth: '300px',
                        height: '100%'
                    }}
                />
                <div
                    ref={exportsChartRef}
                    style={{
                        flex: 1,
                        backgroundColor: '#fff',
                        borderRadius: '8px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        height: '100%'
                    }}
                />
            </div>

            {(loadingProductData || loadingTopData) && <div>Loading data...</div>}
        </div>
    );
};