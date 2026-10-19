import {readFileSync,writeFileSync} from 'node:fs';
import {locationFrom,parseMet,validWeatherSettings} from '/workspace/scratch/3003a07bf54f/offgrid-mate-v2/src/weather.ts';
const payload=JSON.parse(readFileSync('/tmp/offgrid-weather-live.json','utf8'));
const cache=parseMet(payload,locationFrom('Cairns',-16.9186,145.7781));
const result={provider:'MET Norway Locationforecast 2.0',source:'https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=-16.9186&lon=145.7781',attribution:'MET Norway, CC BY 4.0. Aggregated into planning estimates by OffGrid Mate.',httpStatus:200,liveRequestVerified:true,modelUpdatedAt:cache.modelUpdatedAt,validatedCache:validWeatherSettings({mode:'auto',location:cache.location,cache}),firstSevenDays:cache.days.slice(0,7)};
writeFileSync('docs/live-weather-smoke.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({valid:result.validatedCache,days:result.firstSevenDays.length,modelUpdatedAt:result.modelUpdatedAt}));
