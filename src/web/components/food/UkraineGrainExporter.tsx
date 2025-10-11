import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { useData } from '../../hooks/useData';
import * as Prm from '../params';

const eventData = {
  "1995": {
    title: "Post-Soviet output collapse",
    description: "\"Following independence in 1991, Ukraine's agricultural sector entered a decade of decline. Diminishing animal inventories freed up an exportable supply of feed grains. However, exports of this surplus grain were limited until 1994 when state price controls were reduced and export restrictions were removed\"",
    newsUrl: "https://apps.fas.usda.gov/newgainapi/api/Report/DownloadReportByFileName?fileName=How+is+Ukrainian+Grain+Competitive%3F_Kyiv_Ukraine_08-02-2002.pdf"
  },
  "2007": {
    title: "Export Quotas",
    description: "Govenrment introduces quotas to guarantee food security and protect domestic consumers from rising international wheat prices.",
    newsUrl: "https://documents.worldbank.org/en/publication/documents-reports/documentdetail/365851468309268556/the-quotas-on-grain-exports-in-ukraine-ineffective-inefficient-and-non-transparent?"
  },
  "2011": {
    title: "Black Sea Drought",
    description: "Regional drought and food-price fears bring back quotas and export taxes; wheat share dips even though world prices are high.",
    newsUrl: "https://link.springer.com/article/10.1007/s12571-014-0372-2?"
  },
  "2021": {
    title: "All-Time Wheat Production Record",
    description: "Ideal weather plus technology gains boost production to 32 Metric Tons; exports reach 24 Mt",
    newsUrl: "https://www.world-grain.com/articles/15771-ukraine-expects-record-harvest-in-2021-22?"
  },
  "2022": {
    title: "Invasion and Grain Deal",
    description: "Seaborne exports collapse after February 24 as the Black Sea is blockaded. The subsequent Black Sea grain deal helps avoid an export collapse.",
    newsUrl: "https://en.wikipedia.org/wiki/Humanitarian_impacts_of_the_Russian_invasion_of_Ukraine?"
  },
};

interface TradeFlowData {
  year: number;
  ratio_total_exp_usd: number;
  ratio_total_exp_weight: number;
  value_trln_USD: number;
  quantity_mln_metric_tons: number;
}

export const UkraineGrainExporter: React.FC = () => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [selectedPoint, setSelectedPoint] = useState<{ year: number; value: number } | null>(null);
  const { data: flowData, loading } = useData<TradeFlowData[]>('country_specific/UKR/cereal_exports.csv');

  useEffect(() => {
    if (!chartRef.current || !flowData) return;

    const chart = echarts.init(chartRef.current);
    const option = {
      title: {
        text: 'Ukrainian Cereal Exports Normalized to Global Total',
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
      legend: {
        data: ['Cereal Exports as % of Total (USD)', 'Cereal Exports as % of Total (Weight)'],
        bottom: 10, // Position the legend at the bottom
        textStyle: {
          fontSize: Prm.label_fontsz // Consistent font size
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%', // Increased bottom margin to make space for the legend
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: flowData.map((d) => d.year),
        axisLabel: {
          fontSize: Prm.label_fontsz,
        }
      },
      yAxis: {
        type: 'value',
        name: 'Exports % Global Exports ',
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
      series: [
        {
          name: 'Cereal Exports as % of Total (USD)',
          type: 'line',
          data: flowData.map((d) => Math.round(d.ratio_total_exp_usd * 1000) / 10),
          smooth: true,
          lineStyle: {
            color: Prm.curve_color_ukr_yellow,   // line color
            width: Prm.line_width            // optional: line width
          },
          itemStyle: {
            color: Prm.curve_color_ukr_yellow    // marker (symbol) color
          },
        },
        {
          name: 'Cereal Exports as % of Total (Weight)',
          type: 'line',
          data: flowData.map(d => ({
            value: Math.round(d.ratio_total_exp_weight * 1000) / 10,
            itemStyle: {
              color: eventData[d.year] ? Prm.curve_color_ukr_blue : Prm.curve_color_ukr_blue,
              borderColor: eventData[d.year] ? '#FFF' : 'transparent',
              borderWidth: eventData[d.year] ? 2 : 0,
              shadowColor: eventData[d.year] ? 'rgba(255,107,107,0.5)' : 'transparent',
              shadowBlur: eventData[d.year] ? 10 : 0
            },
            symbolSize: eventData[d.year] ? Prm.large_marker_size : 1,
            symbol: eventData[d.year] ? 'triangle' : Prm.marker_shape,
          })),
          smooth: true,
          lineStyle: {
            color: Prm.curve_color_ukr_blue,   // line color
            width: Prm.line_width            // optional: line width
          },
          itemStyle: {
            color: Prm.curve_color_ukr_blue    // marker (symbol) color
          },
        },

      ]
    };

    chart.setOption(option);

    // Click event handler
    chart.on('click', (params: any) => {
      if (params.componentType === 'series') {
        const year = flowData[params.dataIndex].year;
        const value = flowData[params.dataIndex].ratio_total_exp_weight;
        setSelectedPoint({ year, value });
      }
    });

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

      {/* Event Code Start */}
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
                            <a
                                href={eventData[selectedPoint.year].newsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    color: '#1a0dab',           // typical link blue (Google-style)
                                    textDecoration: 'underline', // underline the text
                                    fontWeight: 'normal'         // optional: keep weight normal inside h3
                                }}
                            >
                                {eventData[selectedPoint.year].title} ({selectedPoint.year})
                            </a>
                        </h3>
                        <p style={{ fontSize: '0.9rem' }}>
                            {eventData[selectedPoint.year].description}
                        </p>
                        <a
                            href={eventData[selectedPoint.year].newsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                        </a>
                        <p style={{ fontSize: '0.9rem' }}>
                            Value: {selectedPoint.value.toLocaleString()} mln tons
                        </p>
                    </div>
                </>
            )}
            {/* Event Code End */}
    </div>
  );
};
