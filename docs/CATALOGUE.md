# Equipment catalogue — research and maintenance

Revision 2, checked 19 October 2026. **334 entries across 21 brands**, expanded from 12 entries / 9 brands. These are distinct model or electrical-output choices, not a claim to cover every product ever made. Some entries are retained for existing owners and may be phased out or unavailable locally.

**266 entries have an electrical planning prefill; 68 are model-only entries requiring manual consumption.** All have a manufacturer source URL, a checked date and caveats. “Verified” means the source supports the fields actually supplied, not that a product has a laboratory-verified daily consumption figure.

| Brand | Entries |
| --- | ---: |
| ARB | 2 |
| BLUETTI | 11 |
| Brass Monkey | 34 |
| Bushman | 5 |
| Dometic | 16 |
| EcoFlow | 12 |
| Enerdrive / Dometic | 19 |
| Engel | 18 |
| EvaKool | 14 |
| GME | 2 |
| Goal Zero | 27 |
| Hardkorr | 22 |
| Jackery | 3 |
| KickAss | 18 |
| Projecta | 2 |
| REDARC | 15 |
| Renogy | 29 |
| Starlink | 4 |
| Victron Energy | 38 |
| iTechworld | 31 |
| myCOOLMAN | 12 |

| Equipment type | Entries |
| --- | ---: |
| communications | 6 |
| dcdc | 35 |
| fridge | 103 |
| inverter | 18 |
| lighting | 9 |
| mains | 38 |
| solar | 125 |

## Research approach

Reviewed manufacturer ranges, regional product pages, official published product listings, publicly exposed manufacturer product/variant records, technical tables and manuals. Shopify product records were used during maintainer research to enumerate real published products and SKUs; the Android app does not scrape websites or request storefront feeds. Only reviewed entries were published in the maintained JSON catalogue. Promotional copies, multipacks of an existing model, unrelated accessories, power-station bundles and wiring kits were not counted as new equipment. A packaged panel's rating is per panel, with quantity controlled separately.

The factual model names and numerical specifications are retained; marketing descriptions and images are not copied. Each entry in `public/equipment-catalogue.json` carries its source and qualifications. Broad coverage includes N-Type, ShadowFlux, E.Flex, RBC/DCC, IP67, Blue Smart, Orion, VE.Direct, BCDC Classic/Core/Alpha, iTECHDCDC/iTECHBC, ePOWER, Nomad/Boulder, SolarSaga, MT/MT-V/Elite, CFX/CFF, iFROST and other Australian camping ranges.

Representative primary sources:

- Renogy AU product and variant catalogue: https://au.renogy.com/collections/products
- Engel Australia official product range: https://engelaustralia.com.au/portable-fridge-freezers/
- Victron Blue Smart 230V and HW15 inverter manuals: linked individually in each entry. Values follow the exact voltage/model column.
- REDARC DC-DC range: https://www.redarcelectronics.com/au/battery-chargers/dc-to-dc-chargers
- Brass Monkey manufacturer input-current table: https://help.brassmonkey.cool/hc/en-us/articles/35109607670937-What-are-the-fridge-dimensions-What-is-the-Amp-power-draw-How-do-I-find-the-measurements-I-need-a-data-sheet
- Projecta IDCX manual: https://cdn.shopify.com/s/files/1/0762/1738/5185/files/IDCX_Instruction_Manual_colour_06-26_Screen.pdf?v=1780625924
- GME Gen 2 manual: https://www.gme.net.au/app/uploads/XRS-GEN2-IM.pdf
- Starlink stock-kit specification sheets and Help Centre power ranges: source URLs in the corresponding entries.

## Electrical safeguards and limitations

- Solar ratings are per-panel nameplate output. Existing weather, controller clipping and yield are applied separately. Bifacial rear output is not simply added to front output. Tiny USB panels still need suitable voltage conversion/controllers and may not be suitable for the selected battery. The catalogue does not approve wiring compatibility.
- Charger amps are battery output, not input draw or a consuming load. Renogy RBC2125DS has separate 12V/50A and 24V/25A output choices for the same physical charger. Input voltage labels are not treated as output voltage; Projecta IDCX's 12/24V vehicle input charges a nominal 12V auxiliary battery.
- Shared MPPT/DC-DC controllers use the planner's existing approximation. Current splits, alternator protection, thermal derating and device firmware algorithms are not simulated exactly. Enerdrive 40A+ uses its default 40A setting; raise it only after checking installed conditions.
- Victron inverter ratings distinguish VA names, continuous W, timed peak W, maximum efficiency and standard-mode idle input. Rated inverter capacity is not added as appliance demand. These are HW15 values, which may differ from older hardware.
- Fridge rated/running watts are not daily averages. Where input current and voltage are published, watts are converted at that voltage. Every fridge starts with an explicitly estimated 45% duty cycle unless measured daily energy is supplied. Hot weather, freezer use and ventilation can change this substantially.
- Engel variable-current ranges without separate 12/24V figures retain the existing explicitly labelled nominal-12V upper-bound assumption. Bushman and myCOOLMAN consumption figures with ambiguous Ah/time notation are not converted into daily Wh. Some Dometic and EvaKool entries are model-only because a matched consumption specification was not established.
- Brass Monkey GH1660/GH1662 stationary-only uprights were excluded; the manufacturer says they are unsuitable for a moving camper. Current-table identities include legacy models, so the checked date does not guarantee current stock.
- GME 5W RF output and 2A fuse ratings are not input consumption. GME models require manual battery demand. Internal-battery lanterns require measured external charging demand unless a usable input specification is supplied.
- Starlink stock AC kits select AC operation, using the upper manufacturer average-use bound rather than a peak. External inverter loss is added once. Earlier prototype clients ignore the new `ac` field: on those clients, manually tick “Runs through an AC inverter” as stated in the product notes, or install the updated build. Existing saved items are never rewritten by a catalogue update.
- Standalone solar controllers, battery models, integrated power stations and multi-function mains/inverter combinations are omitted where the current editor cannot represent their roles faithfully. Use existing system settings or Custom as appropriate. Manufacturer ranges remain incomplete; this is an expandable maintained catalogue.

## Finding and updating equipment

Appliances → Add appliance → Brand → equipment-type filter → search Product / Model. “Enter power” indicates a model-only item. Source evidence and assumptions appear after selection. Custom / Not listed remains available. Changing brand clears the previous model search/filter so it cannot hide another brand's products. Selection remains visible while editing a search.

The bundled revision is available offline. The cache records the catalogue revision; a legacy 12-item cache cannot hide a newer bundle, and an older server response cannot downgrade a newer cache. Existing setups, overrides and custom templates are independent of catalogue updates. All 12 original product IDs are retained.

Maintainers: add only supported categories and verified fields; keep IDs stable; increment `revision` for every published data edit; retain source/test conditions; use `basis` for a short interpretation and `notes` for missing/ambiguous values. Run `npm test` and `npm run build`. Move the raw-GitHub prototype feed to a stable release branch before commercial launch. There are no new API keys, ongoing scraping services or paid commitments.
