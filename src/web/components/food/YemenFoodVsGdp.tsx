import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { useData } from '../../hooks/useData';
import * as Prm from '../params';

const eventData = {
  "1995": {
    title: "Market-opening reform",
    description: "Structural-adjustment cuts wheat-flour subsidies, pushing Yemen—already importing ≈70 % of its staples—to rely almost entirely on private, dollar-denominated cereal purchases.",
    newsUrl: "https://en.wikipedia.org/wiki/Economy_of_Yemen"
  },
  "2011": {
    title: "Arab-Spring supply squeeze",
    description: "Port strikes and currency slides lift wheat-flour retail prices 40–60 %, forcing emergency purchases.",
    newsUrl: "https://en.wikipedia.org/wiki/Yemeni_revolution?"
  },
  "2014": {
    title: "Yemeni Civil War",
    description: "After Sana'a's takeover, 70 % of the population in the north must now depend on Red-Sea ports for 90 % of their grain, tightening geographic reliance on imports.",
    newsUrl: "https://en.wikipedia.org/wiki/Houthi_takeover_in_Yemen?"
  },
  "2015": {
    title: "Coalition blockade Begins",
    description: "Saudi-led naval and air restrictions cut monthly wheat arrivals by half, leaving only ~1 Mt landed that year and pushing 6 m Yemenis into IPC “crisis” or worse food insecurity.",
    newsUrl: "https://en.wikipedia.org/wiki/Saudi-led_intervention_in_the_Yemeni_civil_war?"
  },
  "2016": {
    title: "Famine in Yemen ",
    description: "President Hadi's decision to move the Central Bank to Aden in September 2016, triggering a liquidity crunch that has fueled famine, as somewhere between 8.5 million and 10 million Yemenis rely on public sector salaries that remained unpaid for more than a year. ",
    newsUrl: "https://en.wikipedia.org/wiki/Famine_in_Yemen_%282016%E2%80%93present%29?"
  },
};

// International agencies classify Yemen as facing “famine-like conditions” continuously from 2016 to the present, 
// with IPC Phase 4/5 hotspots persisting each year since the Central-Bank split triggered a nationwide liquidity 
// and salary crisis
// https://en.wikipedia.org/wiki/Famine_in_Yemen_%282016%E2%80%93present%29?

interface TradeFlowData {
  year: number;
  imports_pcnt_gdp: number;
}

export const YemenFoodVsGdp: React.FC = () => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [selectedPoint, setSelectedPoint] = useState<{ year: number; value: number } | null>(null);
  const { data: flowData, loading } = useData<TradeFlowData[]>('country_specific/YEM/food_vs_gdp.csv');

  useEffect(() => {
    if (!chartRef.current || !flowData) return;

    const chart = echarts.init(chartRef.current);
    const option = {
      title: {
        text: 'Yemeni Food Imports as % of GDP',
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
      xAxis: {
        type: 'category',
        data: flowData.map((d) => d.year),
        axisLabel: {
          fontSize: Prm.label_fontsz,
        }
      },
      yAxis: {
        type: 'value',
        name: 'Food Imports % GDP',
        nameLocation: 'middle',
        nameGap: 50,
        nameTextStyle: {
          fontSize: Prm.title_fontsz,   // ← set your desired font size here
          fontWeight: 'bold',      // optional
        },
        axisLabel: {
          fontSize: Prm.label_fontsz,
        }
      },
      series: [
        {
          name: 'Food Imports % GDP',
          type: 'line',
          // data: flowData.map((d) => Math.round(d.imports_pcnt_gdp * 1000) / 10),
          data: flowData.map(d => ({
            value: Math.round(d.imports_pcnt_gdp * 1000) / 10,
            itemStyle: {
              color: eventData[d.year] ? Prm.curve_color_red : Prm.curve_color_blue,
              borderColor: eventData[d.year] ? '#FFF' : 'transparent',
              borderWidth: eventData[d.year] ? 2 : 0,
              shadowColor: eventData[d.year] ? 'rgba(255,107,107,0.5)' : 'transparent',
              shadowBlur: eventData[d.year] ? 10 : 0
            },
            symbolSize: eventData[d.year] ? Prm.large_marker_size : Prm.marker_size,
            symbol: eventData[d.year] ? 'triangle' : Prm.marker_shape,
          })),
          smooth: true,
          lineStyle: {
            color: Prm.yemen_black,   // line color
            width: Prm.line_width            // optional: line width
          },
          itemStyle: {
            color: Prm.yemen_black    // marker (symbol) color
          },
        },

      ]
    };

    chart.setOption(option);

    // Click event handler
    chart.on('click', (params: any) => {
      if (params.componentType === 'series') {
        const year = flowData[params.dataIndex].year;
        const value = flowData[params.dataIndex].imports_pcnt_gdp;
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
    <div style={{ position: 'relative', width: '100%' }}> {/* Added width: '100%' */}
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
              Value: {selectedPoint.value.toLocaleString()}
            </p>
          </div>
        </>
      )}
      {/* Event Code End */}
    </div>
  );
};
