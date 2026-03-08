export const config = { runtime: 'edge' };

import { createDomainGateway } from '../../../server/gateway';
import { createTradingRoutes } from '../../../server/worldmonitor/trading/v1/handler';

export default createDomainGateway(createTradingRoutes());
