import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { useData } from '../../hooks/useData';
import * as Prm from '../params';

const eventData = {
    "1995": {
        title: "WTO Established",
        description: "World Trade Organization officially begins operation on January 1, 1995.",
        imageUrl: "./assets/wto.png",
        newsUrl: "https://en.wikipedia.org/wiki/World_Trade_Organization"
    },
    "2001": {
        title: "China joined WTO",
        description: "Jesus Christ pls save me from this huge trade deficit.",
        imageUrl: "./assets/wto-china.jpg",
        newsUrl: "https://www.wto.org/english/thewto_e/acc_e/s7lu_e.pdf"
    },
    "2008": {
        title: "Global Financial Crisis",
        description: "Trade volumes dropped sharply during the financial crisis.",
        imageUrl: "./assets/2008-mortgage.webp",
        newsUrl: "https://en.wikipedia.org/wiki/2008_financial_crisis"
    },
    "2016": {
        title: "MAKE AMERICA GREAT AGAIN!!!!!!!!!!!!!!!",
        description: "CHINA!!!!!!!!!!!!!!!!!!!!!",
        imageUrl: "./assets/trump_mad.webp",
        newsUrl: "https://www.bbc.com/news/election-us-2016-37920175"
    },
    "2020": {
        title: "COVID-19 Pandemic",
        description: "Global trade was significantly disrupted by pandemic lockdowns.",
        imageUrl: "./assets/corona.jpg",
        newsUrl: "https://www.who.int/news/item/29-06-2020-covidtimeline"
    }
};

interface TradeFlowData {
    year: number;
    exporter: string;
    value_trln_USD: number;
    quantity_mln_metric_tons: number;
}

export const ChinaFuelSources: React.FC = () => {
    const chartRef = useRef<HTMLDivElement>(null);
    const [selectedPoint, setSelectedPoint] = useState<{ year: string; value: number } | null>(null);
    const { data: flowData, loading } = useData<TradeFlowData[]>('country_specific/CHN/top15_sources.csv');

    useEffect(() => {
        if (!chartRef.current || !flowData) return;

        const chart = echarts.init(chartRef.current);
        const option = {
            title: {
                text: 'Top Exporters of Mineral Fuels to China (2023)',
                left: 'center',
                top: 'top',
                textStyle: {
                    fontSize: Prm.plot_title_fontsz,
                    fontWeight: 'bold'
                },
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'shadow', // better for bar charts (you can use 'line' if preferred)
                    label: { backgroundColor: '#6a7985' }
                },
                formatter: (params: any[]) => {
                    // Use the first point’s x-axis label
                    const category = params[0].name;
                    let s = `<b>${category}</b><br/>`;
                    params.forEach(p => {
                        s += `${p.marker}${p.seriesName}: ${p.value}<br/>`;
                    });
                    return s;
                }
            },
            grid: {
                show: false,
                left: '10%',
                right: '10%',
                top: '10%',
                bottom: '10%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: flowData.map(d => d.exporter),
                splitLine: { show: false },
                axisLabel: {
                    rotate: 45,
                    interval: 0,
                    fontSize: Prm.label_fontsz,
                },
            },
            yAxis: [
                {
                    type: 'value',
                    name: 'Mineral Fuel Imports (Billion $)',
                    nameLocation: 'middle',
                    nameGap: 50,
                    nameTextStyle: {
                        fontSize: Prm.title_fontsz,
                        fontWeight: 'bold',
                    },
                    axisLabel: {
                        fontSize: Prm.label_fontsz,
                    }
                },
            ],
            series: [
                {
                    name: 'Billion $',
                    type: 'bar',
                    data: flowData.map(d => Math.round(d.value_trln_USD * 10000) / 10),
                    itemStyle: {
                        color: Prm.curve_color_china_red
                    }
                },
            ]
        };

        chart.setOption(option);

        // chart.on('click', (params: any) => {
        //   if (params.componentType === 'series') {
        //     const year = flowData[params.dataIndex].year;
        //     const value =
        //       params.seriesName === 'Imports'
        //         ? flowData[params.dataIndex].imports_mln_metric_tons
        //         : flowData[params.dataIndex].exports_mln_metric_tons;
        //     setSelectedPoint({ year, value });
        //   }
        // });

        const handleResize = () => chart.resize();
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.dispose();
        };
    }, [flowData]);

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            <div ref={chartRef} style={{ width: '100%', height: '400px' }} />

            {selectedPoint && eventData[selectedPoint.year] && (
                <>
                    <div
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            width: '100vw',
                            height: '100vh',
                            background: 'rgba(0,0,0,0)',
                            zIndex: 999
                        }}
                        onClick={() => setSelectedPoint(null)}
                    />
                    <div
                        style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            backgroundColor: 'white',
                            padding: '20px',
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            zIndex: 1000,
                            maxWidth: '250px'
                        }}
                    >
                        <button
                            onClick={() => setSelectedPoint(null)}
                            style={{
                                position: 'absolute',
                                top: '10px',
                                right: '10px',
                                background: 'none',
                                border: 'none',
                                fontSize: '18px',
                                cursor: 'pointer'
                            }}
                        >×</button>
                        <h3 style={{ margin: 0, fontSize: '1rem' }}>
                            {eventData[selectedPoint.year].title} ({selectedPoint.year})
                        </h3>
                        <p style={{ fontSize: '0.9rem' }}>
                            {eventData[selectedPoint.year].description}
                        </p>
                        <a
                            href={eventData[selectedPoint.year].newsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <img
                                src={eventData[selectedPoint.year].imageUrl}
                                alt={eventData[selectedPoint.year].title}
                                style={{ width: '100%', borderRadius: '4px', margin: '10px 0' }}
                            />
                        </a>
                        <p style={{ fontSize: '0.9rem' }}>
                            Value: {selectedPoint.value.toLocaleString()}
                        </p>
                    </div>
                </>
            )}
        </div>
    );
};
