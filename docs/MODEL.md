# Energy model and assumptions

## Battery

Nominal energy = bank voltage × total Ah. Two parallel 12.8 V / 300 Ah batteries form a **12.8 V / 600 Ah / 7,680 Wh** bank. Starting energy = nominal energy × starting SOC. Energy above a 20% reserve from full = **6,144 Wh**.

Reserve is a warning level, not an enforced discharge cutoff. The forecast continues below reserve to zero and then records unserved load. This makes an insufficient setup visible. Actual BMS cutoffs and discharge-current limits are not modelled.

The engine works in watt-hours; it does not infer SOC from a battery voltage reading. SOC must be entered from a monitor or another credible measurement.

## Loads

DC daily Wh = running watts × scheduled hours × duty fraction × quantity.

AC battery-bus demand = appliance watts ÷ inverter efficiency. Inverter idle watts are added once per step whenever any enabled AC appliance is scheduled. Idle draw is not added separately for overlapping appliances.

Example fridge: 35 W × 24 hours × 45% compressor duty = 378 Wh/day. This is an editable assumption, not a measured fridge specification. Starlink Mini defaults to 40 W for six hours = 240 Wh/day. With 40 Wh of lights and 40 Wh of devices, the default total is 698 Wh/day. No-charge average-load runtime from full to 20% reserve is about 8.8 days; this does not account for the timing of individual loads.

## Solar

A clear day provides panel watts × peak sun hours × combined solar yield. Default: 500 W × 5 h × 75% = 1,875 Wh before charging storage losses and battery-full curtailment, unless the controller caps output.

A sine profile distributes energy between 06:00 and 18:00. The profile is normalized to the selected peak sun hours. These are equivalent full-power hours, not daylight hours. Weather multipliers are clear 1.00, mixed 0.65, overcast 0.30, rain 0.10. They are illustrative scenarios, not a weather API or site-specific irradiance forecast. Panel shading, orientation and temperature are represented only by the yield setting.

## Charging

Current limits are battery-output amps, multiplied by the selected charging voltage to estimate bus power. Solar output is capped by the MPPT output current. If solar/DC-DC share a controller, their combined power is capped proportionally by the shared controller output limit. This is a generic approximation, not a manufacturer-specific simulation of the Renogy RBC2125DS source-priority algorithm. Its voltage, panel-input, simultaneous-source, current and temperature constraints must be checked against the exact installed unit's manual.

Mains and generator are alternative labels for the same battery charger input, never two duplicate concurrent sources. Alternator and AC schedules repeat each day. Start times and durations use quarter-hour resolution.

At each 15-minute step, bus generation supplies concurrent load first. A positive surplus is capped by total battery charge current, then multiplied by charge efficiency before storage. If generation falls short, the battery supplies the deficit. Energy is bounded between zero and nominal full capacity. Unaccepted positive bus energy is recorded as spilled Wh, excluding accepted charging conversion losses. Available source energy, stored energy and consumed energy are therefore different quantities.

## Limits

- Forecast starts at local-plan midnight, not the device's current clock time.
- No live battery telemetry, Bluetooth, MPPT wiring validation, charging taper, battery degradation, Peukert effect, low-temperature protection, surge load, inverter wattage limit, BMS discharge limit, alternator input current or generator fuel estimation.
- AGM and Other are labels using the same simplified Wh model. Users must select suitable capacity, efficiency and reserve. AGM runtime at high current can differ substantially.
- Duty cycles are averaged within active scheduled periods; actual compressor cycling is not simulated.
- No temperature-dependent capacity or weather-dependent fridge demand. Adjust these inputs manually.
- A full-battery forecast does not establish electrical safety or compatibility.

## Prototype 2 weather and equipment extensions

Auto uses MET forecast cloud data and retains manual weather separately. See WEATHER-AND-EQUIPMENT.md for the attenuation formula and date handling. Measured daily Wh replaces watt/duty estimates. Catalogue chargers/panels update source slots; ratings are never added to consuming load. Solar-priority controllers may disable alternator estimates when solar is available; this is a simplified priority approximation, not a hardware-accurate Renogy simulation.
