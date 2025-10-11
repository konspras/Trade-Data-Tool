import React, { useRef, useEffect } from 'react';
import { scroll, animate } from 'framer-motion'; // or wherever your helpers live
import { GlobalMapSlide } from './FoodMapSlide';
import { SaudiGrainTrade } from './SaudiGrainTrade';
import { YemenFoodVsGdp } from './YemenFoodVsGdp';
import { UkraineGrainExporter } from './UkraineGrainExporter';
import { CountrySlideBTF, CountrySlidePropsBTF } from '../CountrySlideBTF';
import { CountrySlideBTFF, CountrySlidePropsBTFF } from '../CountrySlideBTFF';
import yemen_img from '../../assets/yemen.png';
import saudi_img from '../../assets/saudi_water.avif';
import ukraine_img from '../../assets/ukraine.jpg';

export const FoodSection: React.FC = () => {
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

  const countryData: CountrySlidePropsBTF[] = [
    {
      id: 'yemen',
      title: "Yemen's Dependence on Food Imports",
      imageSrc: yemen_img,
      imageAlt: 'Yemen Food Dependency',
      description:
        `We will first explore trade of food through some unique edge cases. In "food" we include all HS92 categories (18) that are related to human nutrition. The grouping is broad and includes categories like meat and fish, vegetables and fruits, and, crucially, cereals like wheat and rice.
        
        Yemen is a country of 39.39 million people that has great difficulty producing its own food due to severe water scarcity, poor land quality, and war.
        As a result, Yemen imports a large part of the food it consumes and is currently facing food shortages and famine.

        We are trying to capture this external dependence by normalizing food imports to the total size of the country's economy (GDP).
        In 2023, Yemen food imports are equivalent to ~20% of its GDP and the percentage rose significantly after the 2014 civil and subsequent international wars.

        `,
      plot: <YemenFoodVsGdp />,

    },
    {
      id: 'saudi',
      title: "Saudi Arabia's Water Conservation",
      imageSrc: saudi_img,
      imageAlt: 'Saudi Water Conservation',
      description:
        `In 2007, the Saudi government decreed that wheat production must fall by 12.5% year-over-year, with the objective of ending wheat cultivation in the country by 2016.
        
        Naturally, since wheat is a staple food ingredient in Saudi Arabia, the country is largely dependent on cereal imports. The 2007 decision, which is in contrast to the kingdom's 1980s policy of wheat self-sufficiency, was made to protect the country's scarce water reserves.

        Below, we illustrate the rapid growth in cereal imports.
        `,
      // "PLACEHOLDER DEFINE CEREAL (Trade-offs (water/agriculture) and policy choices): Saudi Arabia's grain story reads like a policy whiplash."+ 
      // "Flush with oil money, the kingdom used fossil-aquifer irrigation to become a net" +
      // "wheat exporter in the 1980s-90s. Then, on 19 November 2007, Riyadh ordered production" +
      // "quotas cut each year until domestic procurement stopped—mission accomplished with the last local wheat purchase in 2015/16, turning the country into a four-million-ton-a-year importer. A broader water crackdown followed: green-fodder crops were banned in December 2015, the prohibition taking full effect on 5 November 2018. That same day, the government eased up slightly, offering small farmers subsidised contracts for up to 1.5 million tons of wheat a year. By 2023/24 the revival had lifted output to about 1.2 million tons, but Saudi grain needs still hinge on world markets—and on whichever policy pivot comes next.",
      plot: <SaudiGrainTrade />,
    },
    {
      id: 'ukraine',
      title: "Ukraine the Bread Basket",
      imageSrc: ukraine_img,
      imageAlt: 'Ukraine Fields',
      description:
        `Ukraine is nowadays known to be one of the breadbaskets of the world, but this was not always the case.
        Cereal (mostly wheat) exports were almost zero after the collapse of the Soviet Union.
        
        Not without the occasional volatility, Ukraine emerged as the supplier of ~10% of the worlds cereal exports in terms of weight.
        Despite the 2022 war and naval blockade threatening Ukraine's export industry and the food stability of the planet, Ukraine's contribution to food availability has remained relatively stable.
        
        We visualize the evolution of one of the worlds major food contributors in terms of Cereal exports in Dollar and weight terms.`,
      plot: <UkraineGrainExporter />,
    }
  ];

  return (
    <article id="food-gallery">
      <header style={{
        // Reset any problematic height/min-height from global styles
        height: 'auto',
        minHeight: 'unset',
        // Add desired spacing for this specific header
        paddingTop: '2rem', // Adjust as needed
        paddingBottom: '1rem', // Adjust as needed for space below the h2
      }}>
        <h2>Trade Stories</h2>
      </header>
      <p className="description-text">
        Let's move on from aggregate statistics and talk about narrower classes of goods, 
              <br />
        starting with arguably the most important one: 
              <br />
        <span style={{ fontWeight: "bold", fontSize: "1.3em" }}>Food</span>
      </p>

      <section className="img-group-container" ref={containerRef}>
        <div>
          <ul className="img-group" ref={imgGroupRef}>
            {countryData.map((c) => (
              <CountrySlideBTF key={c.id} {...c} />
            ))}
            <GlobalMapSlide />
          </ul>
        </div>
      </section>
    </article>
  );
};
