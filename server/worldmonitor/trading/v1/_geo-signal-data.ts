/**
 * _geo-signal-data.ts — Extracted data module for geo-signals and tension index.
 * Contains the complete GEO_ASSET_MAP (34 global categories), broadened GDELT query,
 * and expanded region-to-asset mappings.
 *
 * Follows the pattern of _minerals-data.ts in the supply-chain module.
 */

export type Direction = 'BUY' | 'SELL' | 'HOLD';
export type AssetClass = 'Commodities' | 'Equity Indices' | 'Stocks' | 'Forex' | 'Crypto' | 'ETFs' | 'Bonds';

export interface GeoSignalDef {
  symbol: string;
  name: string;
  assetClass: AssetClass;
  direction: Direction;
  baseConfidence: number;
  reasoning: string;
  tags: string[];
}

export interface GeoAssetMapping {
  keywords: string[];
  signals: GeoSignalDef[];
}

export interface RegionAssetEntry {
  patterns: string[];
  assets: string[];
}

// ---------------------------------------------------------------------------
// Broadened GDELT query for list-geo-signals — covers all 34 categories
// ---------------------------------------------------------------------------
export const GDELT_GEO_QUERY =
  'conflict OR sanctions OR escalation OR crisis OR attack OR recession OR hack ' +
  'OR coup OR protest OR earthquake OR tsunami OR drought OR pandemic OR outbreak ' +
  'OR election OR tariff OR pipeline OR shipping OR blackout OR strike OR terrorism ' +
  'OR nuclear OR climate OR regulation OR famine OR militia OR cartel OR default';

// ---------------------------------------------------------------------------
// Complete GEO_ASSET_MAP — 34 categories covering all global regions + verticals
// ---------------------------------------------------------------------------
export const GEO_ASSET_MAP: GeoAssetMapping[] = [
  // ===== EXISTING 5 CATEGORIES (unchanged) =====

  // 1. Middle East / Iran / Israel
  {
    keywords: ['iran', 'israel', 'missile', 'strait of hormuz', 'middle east', 'naval', 'gulf'],
    signals: [
      { symbol: 'XAUUSD', name: 'Gold', assetClass: 'Commodities', direction: 'BUY', baseConfidence: 85, reasoning: 'Safe-haven demand surge driven by military escalation', tags: ['MEDIUM VOLATILITY', 'short-term', 'metals', 'global'] },
      { symbol: 'CL=F', name: 'WTI Crude Oil', assetClass: 'Commodities', direction: 'BUY', baseConfidence: 80, reasoning: 'Supply disruption risk from Strait of Hormuz threat', tags: ['HIGH', 'short-term', 'energy'] },
      { symbol: 'LMT', name: 'Lockheed Martin', assetClass: 'Stocks', direction: 'BUY', baseConfidence: 82, reasoning: 'Defense spending increase expected', tags: ['MEDIUM VOLATILITY', 'medium-term', 'defense'] },
      { symbol: 'SPY', name: 'S&P 500', assetClass: 'Equity Indices', direction: 'SELL', baseConfidence: 65, reasoning: 'Risk-off sentiment from geopolitical escalation', tags: ['HIGH', 'short-term', 'macro'] },
    ],
  },

  // 2. Ukraine / Russia / NATO
  {
    keywords: ['ukraine', 'russia', 'nato', 'nuclear', 'escalation'],
    signals: [
      { symbol: 'NG=F', name: 'Natural Gas', assetClass: 'Commodities', direction: 'BUY', baseConfidence: 78, reasoning: 'European energy supply disruption risk', tags: ['HIGH', 'short-term', 'energy'] },
      { symbol: 'RTX', name: 'RTX Corp', assetClass: 'Stocks', direction: 'BUY', baseConfidence: 80, reasoning: 'NATO defense spending acceleration', tags: ['MEDIUM VOLATILITY', 'medium-term', 'defense'] },
      { symbol: 'EURUSD', name: 'EUR/USD', assetClass: 'Forex', direction: 'SELL', baseConfidence: 70, reasoning: 'EUR weakness on European security concerns', tags: ['MEDIUM VOLATILITY', 'short-term', 'forex'] },
      { symbol: 'GLD', name: 'Gold ETF', assetClass: 'ETFs', direction: 'BUY', baseConfidence: 75, reasoning: 'Flight to safety in precious metals', tags: ['MEDIUM VOLATILITY', 'short-term', 'metals'] },
    ],
  },

  // 3. China / Taiwan / Semiconductors
  {
    keywords: ['china', 'taiwan', 'south china sea', 'trade war', 'tariff', 'semiconductor'],
    signals: [
      { symbol: 'TSM', name: 'TSMC', assetClass: 'Stocks', direction: 'SELL', baseConfidence: 72, reasoning: 'Supply chain risk from cross-strait tension', tags: ['HIGH', 'medium-term', 'semiconductors'] },
      { symbol: 'NVDA', name: 'NVIDIA', assetClass: 'Stocks', direction: 'SELL', baseConfidence: 68, reasoning: 'China export restriction impact on revenue', tags: ['HIGH', 'short-term', 'semiconductors'] },
      { symbol: 'FXI', name: 'China Large-Cap ETF', assetClass: 'ETFs', direction: 'SELL', baseConfidence: 75, reasoning: 'Capital flight from escalation risk', tags: ['HIGH', 'short-term', 'emerging'] },
      { symbol: 'BTC-USD', name: 'Bitcoin', assetClass: 'Crypto', direction: 'BUY', baseConfidence: 55, reasoning: 'Alternative store-of-value narrative during de-globalization', tags: ['EXTREME', 'medium-term', 'crypto'] },
    ],
  },

  // 4. Recession / Monetary Policy
  {
    keywords: ['recession', 'fed', 'interest rate', 'inflation', 'unemployment', 'banking crisis'],
    signals: [
      { symbol: 'TLT', name: '20+ Year Treasury', assetClass: 'Bonds', direction: 'BUY', baseConfidence: 72, reasoning: 'Flight to quality on recession fears', tags: ['LOW', 'medium-term', 'bonds'] },
      { symbol: 'SPY', name: 'S&P 500', assetClass: 'Equity Indices', direction: 'SELL', baseConfidence: 68, reasoning: 'Earnings contraction expected', tags: ['MEDIUM VOLATILITY', 'medium-term', 'macro'] },
      { symbol: 'GLD', name: 'Gold ETF', assetClass: 'ETFs', direction: 'BUY', baseConfidence: 70, reasoning: 'Real rate compression benefits gold', tags: ['MEDIUM VOLATILITY', 'long-term', 'metals'] },
    ],
  },

  // 5. Cybersecurity
  {
    keywords: ['cyber', 'hack', 'ransomware', 'breach', 'vulnerability'],
    signals: [
      { symbol: 'PANW', name: 'Palo Alto Networks', assetClass: 'Stocks', direction: 'BUY', baseConfidence: 70, reasoning: 'Cybersecurity spending increase post-breach events', tags: ['MEDIUM VOLATILITY', 'medium-term', 'cybersecurity'] },
      { symbol: 'CRWD', name: 'CrowdStrike', assetClass: 'Stocks', direction: 'BUY', baseConfidence: 68, reasoning: 'Endpoint security demand surge', tags: ['MEDIUM VOLATILITY', 'medium-term', 'cybersecurity'] },
      { symbol: 'HACK', name: 'Cybersecurity ETF', assetClass: 'ETFs', direction: 'BUY', baseConfidence: 72, reasoning: 'Sector-wide security spending catalyst', tags: ['LOW', 'medium-term', 'cybersecurity'] },
    ],
  },

  // ===== NEW GEOGRAPHIC CATEGORIES (6-18) =====

  // 6. Latin America / Brazil
  {
    keywords: ['brazil', 'lula', 'petrobras', 'amazon deforestation', 'real currency', 'bolsonaro'],
    signals: [
      { symbol: 'EWZ', name: 'Brazil ETF', assetClass: 'ETFs', direction: 'SELL', baseConfidence: 70, reasoning: 'Political instability and fiscal risk weigh on Brazilian assets', tags: ['HIGH', 'short-term', 'emerging', 'latam'] },
      { symbol: 'PBR', name: 'Petrobras', assetClass: 'Stocks', direction: 'SELL', baseConfidence: 68, reasoning: 'State intervention risk in energy sector', tags: ['HIGH', 'short-term', 'energy', 'latam'] },
      { symbol: 'LIT', name: 'Lithium ETF', assetClass: 'ETFs', direction: 'BUY', baseConfidence: 65, reasoning: 'Mineral demand shift to alternative suppliers', tags: ['MEDIUM VOLATILITY', 'medium-term', 'mining'] },
      { symbol: 'DBA', name: 'Agriculture ETF', assetClass: 'ETFs', direction: 'BUY', baseConfidence: 62, reasoning: 'Agricultural commodity supply disruption risk', tags: ['MEDIUM VOLATILITY', 'short-term', 'agriculture'] },
    ],
  },

  // 7. Mexico / Central America
  {
    keywords: ['mexico', 'cartel', 'nearshoring', 'border', 'peso', 'amlo', 'central america'],
    signals: [
      { symbol: 'EWW', name: 'Mexico ETF', assetClass: 'ETFs', direction: 'SELL', baseConfidence: 68, reasoning: 'Cartel violence and political uncertainty impact investment', tags: ['HIGH', 'short-term', 'emerging', 'latam'] },
      { symbol: 'CL=F', name: 'WTI Crude Oil', assetClass: 'Commodities', direction: 'BUY', baseConfidence: 65, reasoning: 'Mexican oil production and refining disruptions', tags: ['MEDIUM VOLATILITY', 'short-term', 'energy'] },
      { symbol: 'SPY', name: 'S&P 500', assetClass: 'Equity Indices', direction: 'SELL', baseConfidence: 60, reasoning: 'US-Mexico trade disruption risk on equities', tags: ['MEDIUM VOLATILITY', 'short-term', 'macro'] },
    ],
  },

  // 8. Argentina / Chile / Andes
  {
    keywords: ['argentina', 'milei', 'chile', 'lithium', 'copper', 'peso argentino', 'andes'],
    signals: [
      { symbol: 'ARGT', name: 'Argentina ETF', assetClass: 'ETFs', direction: 'SELL', baseConfidence: 72, reasoning: 'Currency crisis and fiscal instability', tags: ['EXTREME', 'short-term', 'emerging', 'latam'] },
      { symbol: 'ECH', name: 'Chile ETF', assetClass: 'ETFs', direction: 'SELL', baseConfidence: 65, reasoning: 'Mining sector disruption from policy shifts', tags: ['HIGH', 'short-term', 'emerging', 'latam'] },
      { symbol: 'HG=F', name: 'Copper Futures', assetClass: 'Commodities', direction: 'BUY', baseConfidence: 70, reasoning: 'Copper supply concentration risk in Chile/Peru', tags: ['HIGH', 'medium-term', 'metals'] },
      { symbol: 'LIT', name: 'Lithium ETF', assetClass: 'ETFs', direction: 'BUY', baseConfidence: 68, reasoning: 'Lithium triangle supply disruption premium', tags: ['MEDIUM VOLATILITY', 'medium-term', 'mining'] },
    ],
  },

  // 9. India / South Asia
  {
    keywords: ['india', 'modi', 'pakistan', 'kashmir', 'rupee', 'mumbai', 'bangladesh', 'sri lanka'],
    signals: [
      { symbol: 'INDA', name: 'India ETF', assetClass: 'ETFs', direction: 'SELL', baseConfidence: 70, reasoning: 'Regional conflict and political risk premium', tags: ['HIGH', 'short-term', 'emerging', 'asia'] },
      { symbol: 'INFY', name: 'Infosys', assetClass: 'Stocks', direction: 'SELL', baseConfidence: 65, reasoning: 'IT services sector impacted by instability', tags: ['MEDIUM VOLATILITY', 'short-term', 'tech', 'asia'] },
      { symbol: 'GLD', name: 'Gold ETF', assetClass: 'ETFs', direction: 'BUY', baseConfidence: 72, reasoning: 'Safe-haven demand from South Asian tension', tags: ['MEDIUM VOLATILITY', 'short-term', 'metals'] },
    ],
  },

  // 10. Southeast Asia
  {
    keywords: ['indonesia', 'philippines', 'vietnam', 'thailand', 'malaysia', 'singapore', 'asean', 'mekong'],
    signals: [
      { symbol: 'VNM', name: 'Vietnam ETF', assetClass: 'ETFs', direction: 'SELL', baseConfidence: 65, reasoning: 'ASEAN instability impacts emerging market confidence', tags: ['HIGH', 'short-term', 'emerging', 'asia'] },
      { symbol: 'EIDO', name: 'Indonesia ETF', assetClass: 'ETFs', direction: 'SELL', baseConfidence: 62, reasoning: 'Regional crisis contagion to Indonesian assets', tags: ['HIGH', 'short-term', 'emerging', 'asia'] },
      { symbol: 'EEM', name: 'Emerging Markets ETF', assetClass: 'ETFs', direction: 'SELL', baseConfidence: 60, reasoning: 'Broad EM risk premium widening', tags: ['MEDIUM VOLATILITY', 'short-term', 'emerging'] },
      { symbol: 'THD', name: 'Thailand ETF', assetClass: 'ETFs', direction: 'SELL', baseConfidence: 58, reasoning: 'Political risk and tourism disruption', tags: ['MEDIUM VOLATILITY', 'short-term', 'emerging', 'asia'] },
    ],
  },

  // 11. Japan / Korea
  {
    keywords: ['japan', 'yen', 'boj', 'south korea', 'north korea', 'pyongyang', 'missile test', 'denuclearization'],
    signals: [
      { symbol: 'EWJ', name: 'Japan ETF', assetClass: 'ETFs', direction: 'SELL', baseConfidence: 70, reasoning: 'DPRK escalation weighs on Japanese equities', tags: ['HIGH', 'short-term', 'asia'] },
      { symbol: 'EWY', name: 'South Korea ETF', assetClass: 'ETFs', direction: 'SELL', baseConfidence: 75, reasoning: 'Peninsula tension directly impacts Korean assets', tags: ['HIGH', 'short-term', 'asia'] },
      { symbol: 'LMT', name: 'Lockheed Martin', assetClass: 'Stocks', direction: 'BUY', baseConfidence: 72, reasoning: 'Missile defense spending increase in Pacific', tags: ['MEDIUM VOLATILITY', 'medium-term', 'defense'] },
    ],
  },

  // 12. Oceania / Pacific
  {
    keywords: ['australia', 'new zealand', 'pacific islands', 'aukus', 'solomon islands', 'coral sea'],
    signals: [
      { symbol: 'EWA', name: 'Australia ETF', assetClass: 'ETFs', direction: 'SELL', baseConfidence: 60, reasoning: 'Regional strategic tension impacts Australian markets', tags: ['MEDIUM VOLATILITY', 'short-term', 'asia'] },
      { symbol: 'BHP', name: 'BHP Group', assetClass: 'Stocks', direction: 'SELL', baseConfidence: 65, reasoning: 'Mining export disruption risk from trade tensions', tags: ['MEDIUM VOLATILITY', 'medium-term', 'mining'] },
      { symbol: 'XAUUSD', name: 'Gold', assetClass: 'Commodities', direction: 'BUY', baseConfidence: 62, reasoning: 'Pacific geopolitical premium on safe-haven assets', tags: ['MEDIUM VOLATILITY', 'short-term', 'metals'] },
    ],
  },

  // 13. Sub-Saharan Africa
  {
    keywords: ['nigeria', 'south africa', 'kenya', 'ethiopia', 'congo', 'drc', 'sudan', 'sahel', 'coup', 'junta'],
    signals: [
      { symbol: 'EZA', name: 'South Africa ETF', assetClass: 'ETFs', direction: 'SELL', baseConfidence: 65, reasoning: 'Political instability impacts African investment climate', tags: ['HIGH', 'short-term', 'emerging', 'africa'] },
      { symbol: 'NGE', name: 'Nigeria ETF', assetClass: 'ETFs', direction: 'SELL', baseConfidence: 60, reasoning: 'Security risk and oil sector disruption', tags: ['HIGH', 'short-term', 'emerging', 'africa'] },
      { symbol: 'REMX', name: 'Rare Earth ETF', assetClass: 'ETFs', direction: 'BUY', baseConfidence: 72, reasoning: 'Critical mineral supply disruption from DRC/Sahel instability', tags: ['MEDIUM VOLATILITY', 'medium-term', 'mining'] },
      { symbol: 'CL=F', name: 'WTI Crude Oil', assetClass: 'Commodities', direction: 'BUY', baseConfidence: 65, reasoning: 'Nigerian oil production disruption risk', tags: ['HIGH', 'short-term', 'energy'] },
    ],
  },

  // 14. North Africa
  {
    keywords: ['egypt', 'libya', 'algeria', 'morocco', 'suez', 'mediterranean', 'north africa'],
    signals: [
      { symbol: 'CL=F', name: 'WTI Crude Oil', assetClass: 'Commodities', direction: 'BUY', baseConfidence: 68, reasoning: 'Suez Canal and North African oil supply risk', tags: ['HIGH', 'short-term', 'energy'] },
      { symbol: 'NG=F', name: 'Natural Gas', assetClass: 'Commodities', direction: 'BUY', baseConfidence: 65, reasoning: 'Mediterranean pipeline disruption concerns', tags: ['HIGH', 'short-term', 'energy'] },
      { symbol: 'GLD', name: 'Gold ETF', assetClass: 'ETFs', direction: 'BUY', baseConfidence: 60, reasoning: 'Regional instability drives safe-haven demand', tags: ['MEDIUM VOLATILITY', 'short-term', 'metals'] },
    ],
  },

  // 15. Central Asia
  {
    keywords: ['kazakhstan', 'uzbekistan', 'turkmenistan', 'uranium', 'caspian', 'pipeline', 'central asia'],
    signals: [
      { symbol: 'URA', name: 'Uranium ETF', assetClass: 'ETFs', direction: 'BUY', baseConfidence: 70, reasoning: 'Kazakhstan uranium supply disruption risk (40% world supply)', tags: ['MEDIUM VOLATILITY', 'medium-term', 'energy'] },
      { symbol: 'CL=F', name: 'WTI Crude Oil', assetClass: 'Commodities', direction: 'BUY', baseConfidence: 65, reasoning: 'Caspian pipeline and transit disruption risk', tags: ['MEDIUM VOLATILITY', 'short-term', 'energy'] },
      { symbol: 'PICK', name: 'Mining ETF', assetClass: 'ETFs', direction: 'SELL', baseConfidence: 60, reasoning: 'Central Asian mining operations under political risk', tags: ['MEDIUM VOLATILITY', 'short-term', 'mining'] },
    ],
  },

  // 16. Western Europe Expanded
  {
    keywords: ['spain', 'italy', 'switzerland', 'netherlands', 'eu crisis', 'eurozone', 'ecb', 'sovereign debt'],
    signals: [
      { symbol: 'EURUSD', name: 'EUR/USD', assetClass: 'Forex', direction: 'SELL', baseConfidence: 72, reasoning: 'Eurozone fiscal stress weakens common currency', tags: ['MEDIUM VOLATILITY', 'short-term', 'forex'] },
      { symbol: 'TLT', name: '20+ Year Treasury', assetClass: 'Bonds', direction: 'BUY', baseConfidence: 68, reasoning: 'Flight to US Treasuries from European uncertainty', tags: ['LOW', 'medium-term', 'bonds'] },
      { symbol: 'XLF', name: 'Financials SPDR', assetClass: 'ETFs', direction: 'SELL', baseConfidence: 65, reasoning: 'European banking contagion risk to global financials', tags: ['HIGH', 'short-term', 'finance'] },
    ],
  },

  // 17. Central/Eastern Europe
  {
    keywords: ['poland', 'czech', 'hungary', 'romania', 'balkans', 'nato eastern flank', 'visegrad'],
    signals: [
      { symbol: 'EPOL', name: 'Poland ETF', assetClass: 'ETFs', direction: 'SELL', baseConfidence: 65, reasoning: 'Eastern European risk premium from NATO frontier tension', tags: ['HIGH', 'short-term', 'emerging', 'europe'] },
      { symbol: 'EURUSD', name: 'EUR/USD', assetClass: 'Forex', direction: 'SELL', baseConfidence: 60, reasoning: 'Eastern EU instability weighs on euro', tags: ['MEDIUM VOLATILITY', 'short-term', 'forex'] },
      { symbol: 'RTX', name: 'RTX Corp', assetClass: 'Stocks', direction: 'BUY', baseConfidence: 68, reasoning: 'NATO Eastern European defense buildup', tags: ['MEDIUM VOLATILITY', 'medium-term', 'defense'] },
    ],
  },

  // 18. Arctic / Northern Europe
  {
    keywords: ['arctic', 'norway', 'finland', 'sweden', 'iceland', 'northern sea route', 'svalbard', 'nordic'],
    signals: [
      { symbol: 'NG=F', name: 'Natural Gas', assetClass: 'Commodities', direction: 'BUY', baseConfidence: 65, reasoning: 'Nordic energy infrastructure threat premium', tags: ['MEDIUM VOLATILITY', 'short-term', 'energy'] },
      { symbol: 'CL=F', name: 'WTI Crude Oil', assetClass: 'Commodities', direction: 'BUY', baseConfidence: 62, reasoning: 'North Sea and Arctic drilling disruption risk', tags: ['MEDIUM VOLATILITY', 'short-term', 'energy'] },
      { symbol: 'GLD', name: 'Gold ETF', assetClass: 'ETFs', direction: 'BUY', baseConfidence: 58, reasoning: 'Arctic geopolitical friction drives safe-haven flows', tags: ['LOW', 'short-term', 'metals'] },
    ],
  },

  // ===== NEW THEMATIC VERTICALS (19-34) =====

  // 19. Energy Transition / Climate
  {
    keywords: ['renewable', 'solar', 'wind', 'carbon', 'ev', 'electric vehicle', 'green energy', 'paris agreement', 'climate summit', 'carbon tax'],
    signals: [
      { symbol: 'ICLN', name: 'Clean Energy ETF', assetClass: 'ETFs', direction: 'BUY', baseConfidence: 70, reasoning: 'Climate policy acceleration drives clean energy investment', tags: ['MEDIUM VOLATILITY', 'medium-term', 'energy'] },
      { symbol: 'TSLA', name: 'Tesla', assetClass: 'Stocks', direction: 'BUY', baseConfidence: 68, reasoning: 'EV adoption accelerates on policy support', tags: ['HIGH', 'medium-term', 'ev'] },
      { symbol: 'XLE', name: 'Energy SPDR', assetClass: 'ETFs', direction: 'SELL', baseConfidence: 65, reasoning: 'Fossil fuel sector faces transition headwinds', tags: ['MEDIUM VOLATILITY', 'long-term', 'energy'] },
      { symbol: 'LIT', name: 'Lithium ETF', assetClass: 'ETFs', direction: 'BUY', baseConfidence: 72, reasoning: 'Battery mineral demand surges on EV transition', tags: ['MEDIUM VOLATILITY', 'medium-term', 'mining'] },
    ],
  },

  // 20. Agriculture / Food Security
  {
    keywords: ['drought', 'flood', 'crop failure', 'famine', 'wheat', 'grain', 'fertilizer', 'export ban', 'food crisis', 'locust'],
    signals: [
      { symbol: 'DBA', name: 'Agriculture ETF', assetClass: 'ETFs', direction: 'BUY', baseConfidence: 75, reasoning: 'Agricultural commodity prices surge on supply disruption', tags: ['HIGH', 'short-term', 'agriculture'] },
      { symbol: 'WEAT', name: 'Wheat ETF', assetClass: 'ETFs', direction: 'BUY', baseConfidence: 78, reasoning: 'Grain shortage premium from production disruption', tags: ['HIGH', 'short-term', 'agriculture'] },
      { symbol: 'ADM', name: 'Archer Daniels Midland', assetClass: 'Stocks', direction: 'BUY', baseConfidence: 65, reasoning: 'Commodity processing margins improve on food scarcity', tags: ['MEDIUM VOLATILITY', 'medium-term', 'agriculture'] },
      { symbol: 'MOS', name: 'Mosaic', assetClass: 'Stocks', direction: 'BUY', baseConfidence: 68, reasoning: 'Fertilizer demand spikes during agricultural crises', tags: ['MEDIUM VOLATILITY', 'medium-term', 'agriculture'] },
    ],
  },

  // 21. Supply Chain / Shipping
  {
    keywords: ['shipping', 'port', 'logistics', 'container', 'freight', 'suez', 'panama canal', 'piracy', 'port strike', 'supply chain disruption'],
    signals: [
      { symbol: 'ZIM', name: 'ZIM Shipping', assetClass: 'Stocks', direction: 'BUY', baseConfidence: 72, reasoning: 'Shipping rates surge on route disruption', tags: ['HIGH', 'short-term', 'logistics'] },
      { symbol: 'FDX', name: 'FedEx', assetClass: 'Stocks', direction: 'SELL', baseConfidence: 65, reasoning: 'Logistics disruption increases costs and delays', tags: ['MEDIUM VOLATILITY', 'short-term', 'logistics'] },
      { symbol: 'XLI', name: 'Industrials SPDR', assetClass: 'ETFs', direction: 'SELL', baseConfidence: 60, reasoning: 'Manufacturing and industrial sector hit by supply chain breakdowns', tags: ['MEDIUM VOLATILITY', 'short-term', 'industrial'] },
    ],
  },

  // 22. Public Health / Pandemics
  {
    keywords: ['pandemic', 'outbreak', 'epidemic', 'bird flu', 'h5n1', 'who emergency', 'lockdown', 'quarantine', 'disease', 'variant'],
    signals: [
      { symbol: 'XLV', name: 'Health Care SPDR', assetClass: 'ETFs', direction: 'BUY', baseConfidence: 72, reasoning: 'Healthcare sector benefits from pandemic preparedness spending', tags: ['MEDIUM VOLATILITY', 'medium-term', 'healthcare'] },
      { symbol: 'PFE', name: 'Pfizer', assetClass: 'Stocks', direction: 'BUY', baseConfidence: 68, reasoning: 'Vaccine and therapeutic demand surge', tags: ['MEDIUM VOLATILITY', 'short-term', 'healthcare'] },
      { symbol: 'SPY', name: 'S&P 500', assetClass: 'Equity Indices', direction: 'SELL', baseConfidence: 65, reasoning: 'Pandemic lockdown fears trigger risk-off', tags: ['HIGH', 'short-term', 'macro'] },
      { symbol: 'EEM', name: 'Emerging Markets ETF', assetClass: 'ETFs', direction: 'SELL', baseConfidence: 62, reasoning: 'EM healthcare capacity concerns amplify contagion risk', tags: ['HIGH', 'short-term', 'emerging'] },
    ],
  },

  // 23. Elections / Political Transitions
  {
    keywords: ['election', 'coup', 'regime change', 'protest', 'impeachment', 'constitutional crisis', 'martial law'],
    signals: [
      { symbol: '^VIX', name: 'VIX Volatility', assetClass: 'Equity Indices', direction: 'BUY', baseConfidence: 75, reasoning: 'Political uncertainty drives volatility expansion', tags: ['HIGH', 'short-term', 'volatility'] },
      { symbol: 'GLD', name: 'Gold ETF', assetClass: 'ETFs', direction: 'BUY', baseConfidence: 70, reasoning: 'Safe-haven demand from political instability', tags: ['MEDIUM VOLATILITY', 'short-term', 'metals'] },
      { symbol: 'EEM', name: 'Emerging Markets ETF', assetClass: 'ETFs', direction: 'SELL', baseConfidence: 65, reasoning: 'Political transition risk in emerging markets', tags: ['HIGH', 'short-term', 'emerging'] },
    ],
  },

  // 24. Trade Policy / Sanctions
  {
    keywords: ['sanction', 'embargo', 'trade agreement', 'trade deal', 'export control', 'import ban', 'wto', 'trade dispute', 'retaliatory tariff'],
    signals: [
      { symbol: 'EEM', name: 'Emerging Markets ETF', assetClass: 'ETFs', direction: 'SELL', baseConfidence: 70, reasoning: 'Sanctions and trade barriers contract EM trade volumes', tags: ['HIGH', 'short-term', 'emerging'] },
      { symbol: 'FXI', name: 'China Large-Cap ETF', assetClass: 'ETFs', direction: 'SELL', baseConfidence: 72, reasoning: 'Trade sanctions directly target Chinese economy', tags: ['HIGH', 'short-term', 'emerging'] },
      { symbol: 'SPY', name: 'S&P 500', assetClass: 'Equity Indices', direction: 'SELL', baseConfidence: 65, reasoning: 'Trade war escalation depresses corporate earnings outlook', tags: ['MEDIUM VOLATILITY', 'medium-term', 'macro'] },
      { symbol: 'GLD', name: 'Gold ETF', assetClass: 'ETFs', direction: 'BUY', baseConfidence: 68, reasoning: 'De-dollarization narrative strengthens gold', tags: ['MEDIUM VOLATILITY', 'medium-term', 'metals'] },
    ],
  },

  // 25. Natural Disasters (Broad)
  {
    keywords: ['earthquake', 'tsunami', 'wildfire', 'volcano', 'hurricane', 'typhoon', 'tornado', 'flooding', 'landslide', 'heat wave'],
    signals: [
      { symbol: 'XLI', name: 'Industrials SPDR', assetClass: 'ETFs', direction: 'BUY', baseConfidence: 65, reasoning: 'Reconstruction spending drives industrial demand', tags: ['MEDIUM VOLATILITY', 'medium-term', 'industrial'] },
      { symbol: 'XLU', name: 'Utilities SPDR', assetClass: 'ETFs', direction: 'SELL', baseConfidence: 60, reasoning: 'Grid damage and infrastructure repair costs', tags: ['MEDIUM VOLATILITY', 'short-term', 'utilities'] },
      { symbol: 'DBA', name: 'Agriculture ETF', assetClass: 'ETFs', direction: 'BUY', baseConfidence: 70, reasoning: 'Crop destruction drives agricultural commodity prices', tags: ['HIGH', 'short-term', 'agriculture'] },
    ],
  },

  // 26. AI / Tech Regulation
  {
    keywords: ['ai regulation', 'antitrust', 'data privacy', 'tech monopoly', 'ai governance', 'gdpr', 'ai ban', 'digital markets act'],
    signals: [
      { symbol: 'XLK', name: 'Technology SPDR', assetClass: 'ETFs', direction: 'SELL', baseConfidence: 70, reasoning: 'Regulatory crackdown constrains tech sector growth', tags: ['MEDIUM VOLATILITY', 'medium-term', 'tech'] },
      { symbol: 'MSFT', name: 'Microsoft', assetClass: 'Stocks', direction: 'SELL', baseConfidence: 65, reasoning: 'AI regulation directly impacts AI infrastructure investment', tags: ['MEDIUM VOLATILITY', 'medium-term', 'tech'] },
      { symbol: 'GOOG', name: 'Alphabet', assetClass: 'Stocks', direction: 'SELL', baseConfidence: 68, reasoning: 'Antitrust and data privacy actions target platform companies', tags: ['MEDIUM VOLATILITY', 'medium-term', 'tech'] },
    ],
  },

  // 27. Mining / Critical Minerals
  {
    keywords: ['lithium', 'cobalt', 'rare earth', 'gallium', 'germanium', 'mining', 'mineral export ban', 'resource nationalism'],
    signals: [
      { symbol: 'REMX', name: 'Rare Earth ETF', assetClass: 'ETFs', direction: 'BUY', baseConfidence: 75, reasoning: 'Critical mineral supply concentration creates scarcity premium', tags: ['MEDIUM VOLATILITY', 'medium-term', 'mining'] },
      { symbol: 'LIT', name: 'Lithium ETF', assetClass: 'ETFs', direction: 'BUY', baseConfidence: 72, reasoning: 'Lithium supply chain disruption drives prices', tags: ['MEDIUM VOLATILITY', 'medium-term', 'mining'] },
      { symbol: 'COPX', name: 'Copper Miners ETF', assetClass: 'ETFs', direction: 'BUY', baseConfidence: 68, reasoning: 'Copper demand for electrification outpaces supply', tags: ['MEDIUM VOLATILITY', 'medium-term', 'mining'] },
      { symbol: 'MP', name: 'MP Materials', assetClass: 'Stocks', direction: 'BUY', baseConfidence: 70, reasoning: 'Rare earth onshoring demand benefits domestic producers', tags: ['MEDIUM VOLATILITY', 'medium-term', 'mining'] },
    ],
  },

  // 28. Banking / Financial Stability
  {
    keywords: ['bank failure', 'bank run', 'sovereign debt', 'currency crisis', 'default', 'credit crunch', 'financial contagion', 'deposit flight'],
    signals: [
      { symbol: 'XLF', name: 'Financials SPDR', assetClass: 'ETFs', direction: 'SELL', baseConfidence: 75, reasoning: 'Banking sector stress spreads contagion fears', tags: ['HIGH', 'short-term', 'finance'] },
      { symbol: 'TLT', name: '20+ Year Treasury', assetClass: 'Bonds', direction: 'BUY', baseConfidence: 72, reasoning: 'Flight to government bonds during banking crisis', tags: ['LOW', 'short-term', 'bonds'] },
      { symbol: 'GLD', name: 'Gold ETF', assetClass: 'ETFs', direction: 'BUY', baseConfidence: 70, reasoning: 'Gold as counterparty-risk-free asset', tags: ['MEDIUM VOLATILITY', 'short-term', 'metals'] },
      { symbol: 'BTC-USD', name: 'Bitcoin', assetClass: 'Crypto', direction: 'BUY', baseConfidence: 58, reasoning: 'Bank distrust narrative strengthens decentralized assets', tags: ['EXTREME', 'medium-term', 'crypto'] },
    ],
  },

  // 29. Infrastructure / Utilities
  {
    keywords: ['power grid', 'blackout', 'telecom outage', 'water crisis', 'pipeline explosion', 'rail derailment', 'bridge collapse'],
    signals: [
      { symbol: 'XLU', name: 'Utilities SPDR', assetClass: 'ETFs', direction: 'SELL', baseConfidence: 65, reasoning: 'Infrastructure failure raises sector risk premium', tags: ['MEDIUM VOLATILITY', 'short-term', 'utilities'] },
      { symbol: 'XLI', name: 'Industrials SPDR', assetClass: 'ETFs', direction: 'BUY', baseConfidence: 68, reasoning: 'Infrastructure rebuild spending benefits industrials', tags: ['MEDIUM VOLATILITY', 'medium-term', 'industrial'] },
      { symbol: 'AWK', name: 'American Water Works', assetClass: 'Stocks', direction: 'BUY', baseConfidence: 60, reasoning: 'Water infrastructure investment increases on crisis events', tags: ['LOW', 'long-term', 'utilities'] },
    ],
  },

  // 30. Labor / Social Unrest
  {
    keywords: ['strike', 'labor dispute', 'protest', 'riot', 'immigration crisis', 'populism', 'general strike', 'union'],
    signals: [
      { symbol: 'SPY', name: 'S&P 500', assetClass: 'Equity Indices', direction: 'SELL', baseConfidence: 62, reasoning: 'Social unrest erodes business confidence and consumer spending', tags: ['MEDIUM VOLATILITY', 'short-term', 'macro'] },
      { symbol: '^VIX', name: 'VIX Volatility', assetClass: 'Equity Indices', direction: 'BUY', baseConfidence: 68, reasoning: 'Civil disruption drives implied volatility higher', tags: ['HIGH', 'short-term', 'volatility'] },
      { symbol: 'XLI', name: 'Industrials SPDR', assetClass: 'ETFs', direction: 'SELL', baseConfidence: 60, reasoning: 'Industrial production disrupted by labor action', tags: ['MEDIUM VOLATILITY', 'short-term', 'industrial'] },
    ],
  },

  // 31. Terrorism / Extremism
  {
    keywords: ['terrorism', 'extremist', 'insurgency', 'bombing', 'hostage', 'militant'],
    signals: [
      { symbol: 'GLD', name: 'Gold ETF', assetClass: 'ETFs', direction: 'BUY', baseConfidence: 78, reasoning: 'Terror events trigger immediate safe-haven buying', tags: ['HIGH', 'short-term', 'metals'] },
      { symbol: 'LMT', name: 'Lockheed Martin', assetClass: 'Stocks', direction: 'BUY', baseConfidence: 72, reasoning: 'Counter-terrorism spending increases defense budgets', tags: ['MEDIUM VOLATILITY', 'medium-term', 'defense'] },
      { symbol: 'SPY', name: 'S&P 500', assetClass: 'Equity Indices', direction: 'SELL', baseConfidence: 68, reasoning: 'Risk-off move on security threat to economic activity', tags: ['HIGH', 'short-term', 'macro'] },
    ],
  },

  // 32. Nuclear Proliferation
  {
    keywords: ['nuclear test', 'nuclear weapon', 'enrichment', 'icbm', 'ballistic missile', 'nonproliferation', 'iaea'],
    signals: [
      { symbol: 'GLD', name: 'Gold ETF', assetClass: 'ETFs', direction: 'BUY', baseConfidence: 82, reasoning: 'Nuclear escalation drives extreme safe-haven demand', tags: ['HIGH', 'short-term', 'metals'] },
      { symbol: 'URA', name: 'Uranium ETF', assetClass: 'ETFs', direction: 'BUY', baseConfidence: 65, reasoning: 'Nuclear focus increases uranium strategic value', tags: ['MEDIUM VOLATILITY', 'medium-term', 'energy'] },
      { symbol: 'SPY', name: 'S&P 500', assetClass: 'Equity Indices', direction: 'SELL', baseConfidence: 70, reasoning: 'Existential risk drives broad market sell-off', tags: ['HIGH', 'short-term', 'macro'] },
      { symbol: 'LMT', name: 'Lockheed Martin', assetClass: 'Stocks', direction: 'BUY', baseConfidence: 75, reasoning: 'Missile defense and nuclear deterrence spending surge', tags: ['MEDIUM VOLATILITY', 'medium-term', 'defense'] },
    ],
  },

  // 33. Space / Satellite / GPS
  {
    keywords: ['satellite', 'gps interference', 'space debris', 'starlink', 'communications disruption', 'anti-satellite', 'space warfare'],
    signals: [
      { symbol: 'LMT', name: 'Lockheed Martin', assetClass: 'Stocks', direction: 'BUY', baseConfidence: 65, reasoning: 'Space defense contracts accelerate on orbital threats', tags: ['MEDIUM VOLATILITY', 'medium-term', 'defense'] },
      { symbol: 'BA', name: 'Boeing', assetClass: 'Stocks', direction: 'BUY', baseConfidence: 58, reasoning: 'Space and satellite replacement demand increases', tags: ['MEDIUM VOLATILITY', 'medium-term', 'aerospace'] },
    ],
  },

  // 34. Drug Trade / Organized Crime
  {
    keywords: ['cartel', 'narco', 'drug trafficking', 'fentanyl', 'organized crime', 'money laundering'],
    signals: [
      { symbol: 'EWW', name: 'Mexico ETF', assetClass: 'ETFs', direction: 'SELL', baseConfidence: 65, reasoning: 'Organized crime disrupts Mexican economic stability', tags: ['HIGH', 'short-term', 'emerging', 'latam'] },
      { symbol: 'GLD', name: 'Gold ETF', assetClass: 'ETFs', direction: 'BUY', baseConfidence: 60, reasoning: 'Security instability increases safe-haven demand', tags: ['LOW', 'short-term', 'metals'] },
    ],
  },
];

// ---------------------------------------------------------------------------
// Region-to-Asset mappings for tension index — comprehensive global coverage
// ---------------------------------------------------------------------------
export const REGION_ASSET_MAP: RegionAssetEntry[] = [
  // Existing regions (expanded)
  { patterns: ['middle east', 'iran', 'iraq', 'gulf', 'saudi', 'yemen', 'syria'], assets: ['CL=F', 'NG=F', 'GLD', 'XOM', 'CVX'] },
  { patterns: ['ukraine', 'russia', 'europe'], assets: ['NG=F', 'WEAT', 'EURUSD', 'LMT', 'RTX'] },
  { patterns: ['china', 'taiwan', 'asia'], assets: ['TSM', 'NVDA', 'AAPL', 'FXI', 'EEM'] },
  { patterns: ['africa', 'nigeria', 'kenya', 'ethiopia', 'congo', 'drc', 'sudan', 'sahel'], assets: ['EZA', 'NGE', 'REMX', 'CL=F'] },

  // New regions
  { patterns: ['brazil', 'argentina', 'venezuela', 'colombia', 'peru', 'chile', 'latin america'], assets: ['EWZ', 'PBR', 'LIT', 'DBA', 'ARGT'] },
  { patterns: ['mexico', 'central america', 'guatemala', 'honduras'], assets: ['EWW', 'CL=F', 'SPY'] },
  { patterns: ['india', 'pakistan', 'bangladesh', 'sri lanka', 'kashmir'], assets: ['INDA', 'INFY', 'GLD'] },
  { patterns: ['indonesia', 'philippines', 'vietnam', 'thailand', 'malaysia', 'singapore', 'asean'], assets: ['VNM', 'EIDO', 'THD', 'EEM'] },
  { patterns: ['japan', 'korea', 'pyongyang'], assets: ['EWJ', 'EWY', 'LMT'] },
  { patterns: ['australia', 'new zealand', 'pacific'], assets: ['EWA', 'BHP'] },
  { patterns: ['egypt', 'libya', 'algeria', 'morocco', 'suez'], assets: ['CL=F', 'NG=F', 'GLD'] },
  { patterns: ['kazakhstan', 'uzbekistan', 'turkmenistan', 'caspian'], assets: ['URA', 'CL=F'] },
  { patterns: ['spain', 'italy', 'switzerland', 'netherlands', 'eurozone', 'ecb'], assets: ['EURUSD', 'TLT', 'XLF'] },
  { patterns: ['poland', 'czech', 'hungary', 'romania', 'balkans'], assets: ['EPOL', 'EURUSD', 'RTX'] },
  { patterns: ['arctic', 'norway', 'finland', 'sweden', 'iceland', 'nordic'], assets: ['NG=F', 'CL=F'] },
];

// Category-based asset mapping for tension index
export const CATEGORY_ASSET_MAP: Record<string, string[]> = {
  cyber: ['PANW', 'CRWD', 'ZS', 'FTNT', 'HACK'],
  natural: ['CL=F', 'NG=F', 'DBA', 'WEAT'],
  political: ['^VIX', 'GLD', 'EEM'],
  supply_chain: ['ZIM', 'FDX', 'XLI'],
  pandemic: ['XLV', 'PFE', 'EEM'],
  agriculture: ['DBA', 'WEAT', 'ADM'],
  banking: ['XLF', 'TLT', 'GLD'],
  climate: ['ICLN', 'XLE', 'LIT'],
  mining: ['REMX', 'LIT', 'COPX'],
  election: ['^VIX', 'GLD', 'EEM'],
  terrorism: ['GLD', 'LMT', 'SPY'],
  nuclear: ['GLD', 'URA', 'LMT'],
};
