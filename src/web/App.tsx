import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Nav from './components/Nav';
import { WorldTradeMap } from "./components/WorldTradeMap";
import { TradeTrendChart } from "./components/TradeTrendChart";
import { TradeGDPChart } from "./components/TradeGDPChart";
import { TradeWeightChart } from "./components/TradeWeightChart";
import { TradeBalanceDistribution } from "./components/TradeBalanceDistribution";
import { WorldTradeMapAnimated } from "./components/WorldTradeMapAnimated";
import { ChapterTotalsBarChart } from "./components/ChapterTotalsBarChart";
import { FoodSection } from './components/food/FoodSection';
import { FuelSection } from './components/fuel/FuelSection';
import { ScrollAnimationWrapper } from './components/ScrollAnimationWrapper'
import { VerticalScrollSection } from './components/VerticalScrollSection';
import { fullPageStyle } from './components/FullPageStyle';
import { ZoomScroll } from './components/ZoomScroll'

import { useEffect, useRef } from 'react';
import { inView, animate } from 'framer-motion';
import { FoodTradeMap } from "./components/food/FoodTradeMap";
import { FuelTradeMap } from "./components/fuel/FuelTradeMap";

export const StoryPage: React.FC = () => {
  const [selectedCountry, setSelectedCountry] = React.useState<string>('');
  const [selectedYear, setSelectedYear] = React.useState<string>('2023');
  const [selectedProduct, setSelectedProduct] = React.useState<string>('84');

  const handleCountryClick = (countryCode: string) => {
    setSelectedCountry(countryCode);
  };

  return (
    <div className="app">
      <Nav />
      <ScrollAnimationWrapper style={fullPageStyle}>
        <section className="intro">
          <header>
            <h1>Acquiring Intuition on Global Trade</h1>
            <p className="description-text">In 2025, the collective brain of humanity turned its attention to the difference between where goods like food and cars are <u>made</u> and where they are <u>consumed</u>.
              Motivated by the desire to reduce transportation emissions or by national security concerns, humanity appears to be peeking under the hood of the global trade system, with the subject debated everywhere from government circles to taxi rides.
              <br />
              <br />
              This website attempts to provide intuition on the ever-more important matter of how goods flow around the world.
              <br />
              Just scroll down :)
            </p>
          </header>
        </section>
      </ScrollAnimationWrapper>
      <main>

        <ScrollAnimationWrapper style={fullPageStyle}>
          <section>
            <header>
              <h2 className="scroll-section-header">The Basics</h2>
            </header>
            <p className="description-text">
              It is said that the world became more and more interconnected over the last 35 years.
              <br />
              Let's get a sense of what changed by asking:
            </p>
          </section>
        </ScrollAnimationWrapper>

        <ScrollAnimationWrapper style={fullPageStyle}>
          <section>
            <h2>What percentage of global economic activity is conducted through trade?</h2>
            <TradeGDPChart />
          </section>
        </ScrollAnimationWrapper>

        <ScrollAnimationWrapper style={fullPageStyle}>
          <section>
            <h2>In order to observe trade trends through a more "material" metric, let's answer:</h2>
            <p className="description-text">
              <i>How many tons of products does humanity shuffle around the world each year?</i>
              <br /><br />
              It turns out that at 15 Billion Metric Tons per year, humanity is shipping the equivalent weight of all 1.2 Billion active cars in the world 
              <br />
              <b><i>7 times over!</i></b>
            </p>
            <TradeWeightChart />
          </section>
        </ScrollAnimationWrapper>

        {/* Moving 15 Billion metric tonnes per year is equivalent to shipping all 1.2 Billion active cars in the world <i>7 times!</i>. */}
        {/* <ScrollAnimationWrapper style={fullPageStyle}>
          <section className="image-text-section">
            <div className="text-column">
              <p className="description-text">
                Moving 15 Billion metric tonnes per year is equivalent to shipping all 1.2 Billion active cars in the world <i>7 times!</i>.
                <br />
                <br />
                (Placeholder Figure)
              </p>
            </div>
          </section>
        </ScrollAnimationWrapper> */}

        <ScrollAnimationWrapper style={fullPageStyle}>
          <section style={{ width: '100%', height: '100%', display: 'flex', aspectRatio: '16/9', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
            <p className="description-text">
              In Dollar terms, some countries consume more material goods than they create.
              <br />
              Others produce the difference but do not consume it themselves.
              <br />
              <br />
              The following map shows the absolute dollar value of the trade balance of each country.
              <br />
              <br />
            </p>
            <WorldTradeMap />
          </section>
        </ScrollAnimationWrapper>

        {/* Sankey */}
        {/* {selectedCountry && (
          <CountrySankey countryCode={selectedCountry} year={selectedYear} productChapter={selectedProduct} />
        )} */}

        <ScrollAnimationWrapper style={fullPageStyle}>
          <section>
            <h2> Which Categories of Goods are more Prominent in Global Trade Value? (2023)</h2>
            <p className="description-text">
              Electronics, Mineral Fuels, Machinery, and Vehicles represent the largest product categories in terms of total dollar value traded globally.
            </p>
            <ChapterTotalsBarChart />
          </section>
        </ScrollAnimationWrapper>

        <FoodSection />
        <FuelSection />

        <ScrollAnimationWrapper style={fullPageStyle}>
          <section>
            <div style={{display:'flex', gap:'1rem', justifyContent:'center'}}>
              <Link className="btn" to="/interactive">Go to Interactive Explorer →</Link>
            </div>
          </section>
        </ScrollAnimationWrapper>
      </main>
    </div>
  );
};

export const InteractivePage: React.FC = () => {
  return (
    <div style={{ width: '100vw', height: '100dvh', margin: 0, padding: 0, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <Nav />
      <div style={{ flex: 1, minHeight: 0, overflow:'hidden' }}>
        <WorldTradeMapAnimated />
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/story" element={<StoryPage />} />
      <Route path="/interactive" element={<InteractivePage />} />
    </Routes>
  );
};

export default App;

const LandingPage: React.FC = () => {
  return (
    <div className="app" style={{minHeight:'100vh', display:'flex', flexDirection:'column'}}>
      <Nav />
      <div style={{textAlign:'center', padding:'2rem', flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column'}}>
        <h1>Acquiring Intuition on Global Trade</h1>
        <p className="description-text">Choose where to start:</p>
        <div style={{display:'flex', gap:'1rem', justifyContent:'center', flexWrap:'wrap'}}>
          <Link className="btn" to="/story">Read the Story →</Link>
          <Link className="btn" to="/interactive">Explore Interactively →</Link>
        </div>
      </div>
    </div>
  );
};