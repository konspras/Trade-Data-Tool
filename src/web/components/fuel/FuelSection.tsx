import React, { useRef, useEffect } from 'react';
import { scroll, animate } from 'framer-motion'; // or wherever your helpers live
import { GlobalMapSlide } from './FuelMapSlide';
import { ChinaFuelTrade } from './ChinaFuelTrade';
import { ChinaFuelSources } from './ChinaFuelSources';
import { UsaFuelTrade } from './UsaFuelTrade';
import { CountrySlideBTF, CountrySlidePropsBTF } from '../CountrySlideBTF';
import { CountrySlideBTFF, CountrySlidePropsBTFF } from '../CountrySlideBTFF';
import usa_banner from '../../assets/usa_oil_2.png';
import china_banner from '../../assets/china.png';

type SlideBTF = CountrySlidePropsBTF & { kind: 'BTF' }
type SlideBTFF = CountrySlidePropsBTFF & { kind: 'BTFF' }

type SlideData = SlideBTF | SlideBTFF

export const FuelSection: React.FC = () => {
  const containerRef = useRef<HTMLElement>(null);
  const imgGroupRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!containerRef.current || !imgGroupRef.current) return;
    const items = imgGroupRef.current.querySelectorAll('.img-container');

    // Animate gallery horizontally during vertical scroll
    scroll(
      animate(imgGroupRef.current, {
        transform: ['none', `translateX(-${(items.length - 1) * 100}vw)`],
      }),
      { target: containerRef.current }
    );
  }, []);

  const countryData: SlideData[] = [
    {
      kind: 'BTF',
      id: 'usa',
      title: "USA: From Chronic Importer to Net Exporter",
      imageSrc: usa_banner,
      imageObjectFit: 'contain', // Specify 'contain' for this slide
      imageAlt: 'USA Oil Barrel',
      description:
        `For most of the post-war era the United States burned more oil and gas than it could pump. Conventional fields onshore and in the Gulf of Mexico peaked in 1970; by 2005 domestic crude output had fallen almost in half, and the country was bringing in roughly 60% of the oil it used. 

        What changed was the rapid commercialisation of shale technology:
        Shale technology uses high-pressure water, sand and chemicals to crack tight shale rock sideways through long horizontal wells, letting trapped oil and gas flow to the surface. Shale drilling has faced strong criticism for its environmental impact as it can lead to water contamination and earthquake risks.
        
        Nevertheless, shale did what traditional drilling could not: it opened vast, previously uneconomic rock to economic exploitation and turned the United States into a net exporter of Mineral Fuels
        
        The Figure below shows the US's Mineral Fuel trade balance along with events that influenced the shale revolution.`,
      plot: <UsaFuelTrade />,

    },
    {
      kind: 'BTFF',
      id: 'china',
      title: "China's Manufacturing Miracle Must be Fed",
      imageSrc: china_banner,
      imageAlt: 'Saudi Water Conservation',
      description:`China industrialized its economy at a breakneck speed starting in the mid 1990s. To keep its industrial machinery running, China consumes vast amounts of mineral fuels like oil and gas, much of which is imported from abroad. The scale of China's industrial achievement also lead to it accounting for ~20% of all mineral fuel imports. Further, China imports ~70% of the oil it consumes from abroad.
      
      The following Figures illustrate China's rapid industrialization and also shed some light into the diverse set of countries that extract and supply the energy, with Russia and Saudi Arabia leading the pack.
      `,
      plot1: <ChinaFuelTrade />,
      plot2: <ChinaFuelSources />,
    },
  ];

  return (
    <article id="fuel-gallery">
      <header>
        <h2>Focus: Mineral Fuels, i.e., Refined and Unrefined Oil, Natural Gass, Coal </h2>
      </header>

      <section className="img-group-container" ref={containerRef}>
        <div>
          <ul className="img-group" ref={imgGroupRef}>
            {countryData.map((slide) => {
              if (slide.kind === 'BTF') {
                return <CountrySlideBTF key={slide.id} {...slide} />
              } else {
                return <CountrySlideBTFF key={slide.id} {...slide} />
              }
            })}
            <GlobalMapSlide />
          </ul>
        </div>
      </section>
    </article>
  );
};
