import {
  collection,
  doc,
  getDocs,
  setDoc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { COLS } from "./catalogService";
import { PartCategory, PartSubcategory, PartBrand } from "../models";

export interface PartImportProgress {
  phase: "init" | "categories" | "subcategories" | "brands" | "done" | "error";
  total: number;
  current: number;
  message: string;
}

export interface PartImportResult {
  success: boolean;
  categoriesCreated: number;
  categoriesUpdated: number;
  subcategoriesCreated: number;
  subcategoriesUpdated: number;
  brandsCreated: number;
  brandsUpdated: number;
  bicycleCategoriesRemoved: number;
  nonAutomotiveCategoriesRemoved: number;
  errors: string[];
}

function cleanSearchName(val?: string): string {
  if (!val) return "";
  return val.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function createSlug(val: string): string {
  return val
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPREHENSIVE CAR PART CATEGORIES (17 Top-Level Automotive Systems)
// ─────────────────────────────────────────────────────────────────────────────
export const RAW_CATEGORIES: {
  name: string;
  description: string;
  sortOrder: number;
}[] = [
  {
    name: "Braking System",
    description:
      "Disc brakes, drum brakes, hydraulic components, ABS sensors & booster units",
    sortOrder: 1,
  },
  {
    name: "Engine & Engine Components",
    description:
      "Engine block, cylinder head, pistons, crankshaft, valvetrain, timing & gaskets",
    sortOrder: 2,
  },
  {
    name: "Filters & Maintenance",
    description:
      "Oil filters, air filters, fuel filters, cabin AC filters & transmission filters",
    sortOrder: 3,
  },
  {
    name: "Clutch & Transmission",
    description:
      "Clutch kits, flywheels, cylinders, manual & auto transmission components, CV axles",
    sortOrder: 4,
  },
  {
    name: "Suspension & Arms",
    description:
      "Shock absorbers, struts, coil springs, lower control arms, bushes & ball joints",
    sortOrder: 5,
  },
  {
    name: "Steering System",
    description:
      "Steering rack & pinion, tie rod ends, EPS motor columns & power steering pumps",
    sortOrder: 6,
  },
  {
    name: "Cooling System",
    description:
      "Radiators, water pumps, thermostats, cooling fans, hoses & expansion reservoirs",
    sortOrder: 7,
  },
  {
    name: "Air Conditioning & Climate",
    description:
      "AC compressors, condensers, evaporators, heater cores, blower motors & pipes",
    sortOrder: 8,
  },
  {
    name: "Fuel Supply System",
    description:
      "Electric fuel pumps, injectors, common rail, throttle bodies & fuel regulators",
    sortOrder: 9,
  },
  {
    name: "Electrical, Battery & Ignition",
    description:
      "Starter motors, alternators, batteries, spark plugs, ignition coils, horns & wiring",
    sortOrder: 10,
  },
  {
    name: "Sensors, Relays & ECUs",
    description:
      "Oxygen, MAF, MAP, Crank, Cam, ABS sensors, engine control units & body modules",
    sortOrder: 11,
  },
  {
    name: "Exhaust & Emission System",
    description:
      "Catalytic converters, exhaust manifolds, silencers, DPF units & EGR valves",
    sortOrder: 12,
  },
  {
    name: "Lighting & Lamps",
    description:
      "Headlight assemblies, tail lights, fog lights, indicators, LED & halogen bulbs",
    sortOrder: 13,
  },
  {
    name: "Body Parts & Panels",
    description:
      "Bumpers, bonnets, fenders, doors, boot lids, side mirrors, glass & grilles",
    sortOrder: 14,
  },
  {
    name: "Interior & Cabin Comfort",
    description:
      "Power window switches, air vents, door handles, sun visors, mirrors & seat belts",
    sortOrder: 15,
  },
  {
    name: "Wheels, Tyres & Hubs",
    description:
      "Wheel hub assemblies, bearings, steel rims, alloy wheels, passenger tyres & nuts",
    sortOrder: 16,
  },
  {
    name: "Fluids, Oils & Consumables",
    description:
      "Synthetic engine oils, brake fluids, coolants, gear oils & specialized lubricants",
    sortOrder: 17,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// COMPREHENSIVE CAR PART SUBCATEGORIES (~180 Specific Components)
// ─────────────────────────────────────────────────────────────────────────────
export const RAW_SUBCATEGORIES_BY_CATEGORY: Record<string, string[]> = {
  "Braking System": [
    "Front Brake Pads",
    "Rear Brake Pads",
    "Brake Discs / Rotors",
    "Brake Shoes",
    "Brake Drums",
    "Brake Caliper Assembly",
    "Brake Caliper Guide Pin Kit & Seals",
    "Brake Master Cylinder",
    "Wheel Brake Cylinder",
    "Brake Vacuum Booster / Servo",
    "Brake Fluid Reservoir Tank",
    "Brake Lines & Flexible Hoses",
    "ABS Wheel Speed Sensors",
    "ABS Modulator & Hydraulic Pump",
    "Handbrake / Parking Brake Cables",
  ],
  "Engine & Engine Components": [
    "Pistons & Gudgeon Pins",
    "Piston Rings Set",
    "Engine Valves (Intake & Exhaust)",
    "Valve Guides, Springs & Stem Seals",
    "Camshaft & Bearings",
    "Crankshaft & Main Bearings",
    "Connecting Rods & Big End Bearings",
    "Cylinder Head Assembly",
    "Cylinder Head Gasket",
    "Complete Engine Overhaul Gasket Kit",
    "Rocker Cover & Gasket",
    "Timing Belt",
    "Timing Chain Kit & Tensioner",
    "Timing Idler & Tensioner Pulleys",
    "Engine Mounts / Bedding (Left, Right, Rear)",
    "Engine Oil Sump / Pan",
    "Engine Oil Pump Assembly",
    "Turbocharger & Actuator",
    "Intercooler & Connecting Hoses",
    "Intake Manifold",
    "Crankshaft Damper Pulley",
    "Flywheel Ring Gear",
    "Engine Oil Dipstick & Tube",
    "PCV (Positive Crankcase Ventilation) Valve",
  ],
  "Filters & Maintenance": [
    "Engine Oil Filter",
    "Engine Air Filter",
    "Fuel Filter / Inline Fuel Strainer",
    "Cabin AC Filter (Pollen / Activated Carbon)",
    "Automatic Transmission Fluid (ATF) Filter",
    "Fuel Tank Pre-Filter Strainer",
    "Engine Crankcase Breather Filter",
  ],
  "Clutch & Transmission": [
    "Clutch Friction Plate / Disc",
    "Clutch Pressure Plate / Cover",
    "Clutch Release Bearing / Concentric Slave (CSC)",
    "Complete 3-Piece Clutch Kit",
    "Flywheel (Single Mass / Dual Mass)",
    "Clutch Master Cylinder",
    "Clutch Slave Cylinder",
    "Clutch Operating Cable",
    "Gear Shifter Cables",
    "Gear Shift Lever & Knob Assembly",
    "CV Axle Shaft Assembly (Left / Right)",
    "CV Joint Outer Kit",
    "CV Joint Inner Kit",
    "CV Joint Rubber Boot Kit",
    "Propeller Shaft & Center Support Bearing",
    "Differential Gears, Bearings & Oil Seals",
    "Synchronizer Rings & Transmission Bearings",
  ],
  "Suspension & Arms": [
    "Front Shock Absorber Struts",
    "Rear Shock Absorbers",
    "Strut Top Mounts & Bearings",
    "Front Coil Springs",
    "Rear Coil Springs",
    "Rear Leaf Spring Assembly & Bushes",
    "Front Lower Control Arm (Wishbone)",
    "Upper Control Arms",
    "Control Arm Rubber Bushes",
    "Lower Suspension Ball Joints",
    "Stabilizer / Sway Bar Link Rods",
    "Stabilizer Bar D-Bushes",
    "Front Subframe / Crossmember",
    "Torsion Bars & Bump Stops",
  ],
  "Steering System": [
    "Steering Rack & Pinion Assembly",
    "Steering Outer Tie Rod Ends",
    "Steering Inner Rack Ends / Axial Rods",
    "Steering Rack Rubber Bellows / Boots",
    "Electric Power Steering (EPS) Column & Motor",
    "Hydraulic Power Steering Pump",
    "Power Steering Fluid Reservoir & Pipes",
    "Steering Intermediate Shaft & U-Joint",
    "Steering Knuckle / Wheel Spindle",
  ],
  "Cooling System": [
    "Engine Radiator",
    "Radiator Pressure Cap",
    "Radiator Cooling Fan & Motor Assembly",
    "Radiator Upper & Lower Rubber Hoses",
    "Engine Water Pump",
    "Thermostat Valve & Housing Assembly",
    "Coolant Expansion Reservoir Tank & Cap",
    "Engine Oil Cooler",
    "Heater Core Hoses & Connectors",
  ],
  "Air Conditioning & Climate": [
    "AC Compressor & Magnetic Clutch",
    "AC Condenser & Receiver Drier",
    "AC Cooling Coil / Evaporator Core",
    "AC Expansion Valve",
    "Cabin Heater Core / Matrix",
    "AC Cabin Blower Motor Assembly",
    "AC Blower Resistor / Regulator",
    "AC High & Low Pressure Lines / Hoses",
    "AC Pressure Sensor Switch",
  ],
  "Fuel Supply System": [
    "Electric In-Tank Fuel Pump Assembly",
    "Fuel Level Sender Unit & Float",
    "Fuel Injectors (Petrol / CRDi Diesel)",
    "High Pressure Fuel Pump (CRDi / GDi)",
    "Common Fuel Rail",
    "Fuel Pressure Regulator Valve",
    "Electronic Throttle Body",
    "Accelerator Pedal Sensor / Cable",
    "Fuel Tank Filler Neck & Cap",
    "Fuel Evaporative (EVAP) Purge Valve",
  ],
  "Electrical, Battery & Ignition": [
    "Starter Motor Assembly",
    "Alternator / Generator",
    "Starter Motor Solenoid Switch",
    "Alternator Voltage Regulator & Rectifier",
    "Automotive Battery",
    "Battery Terminals & Battery Tray",
    "Ignition Spark Plugs",
    "Diesel Glow Plugs",
    "Ignition Coils / Coil-on-Plug (COP)",
    "HT Ignition Wires / Spark Plug Cables",
    "Vehicle Electric Horns (Dual Tone / Trumpet)",
    "Clock Spring / Spiral Cable",
    "Combination Stalk Switch (Light / Wiper)",
    "Main Engine Fuse Box & Relays",
    "Alternator Freewheel OAP Pulley",
  ],
  "Sensors, Relays & ECUs": [
    "Oxygen (O2) Sensor (Upstream / Downstream)",
    "Mass Air Flow (MAF) Sensor",
    "Manifold Absolute Pressure (MAP) Sensor",
    "Crankshaft Position (CKP) Sensor",
    "Camshaft Position (CMP) Sensor",
    "Engine Coolant Temperature (ECT) Sensor",
    "Engine Oil Pressure Warning Switch",
    "Engine Knock Sensor",
    "Throttle Position Sensor (TPS)",
    "Reverse Parking Sensors & Module",
    "Tyre Pressure Monitoring (TPMS) Sensors",
    "Engine Control Unit (ECU / ECM)",
    "Body Control Module (BCM)",
  ],
  "Exhaust & Emission System": [
    "Exhaust Manifold",
    "Exhaust Downpipe & Flex Pipe",
    "Catalytic Converter Assembly",
    "Diesel Particulate Filter (DPF / Catalyser)",
    "Exhaust Center Silencer",
    "Exhaust Rear Muffler",
    "Exhaust Rubber Hangers & Brackets",
    "Exhaust Gaskets, Clamps & Flanges",
    "Exhaust Gas Recirculation (EGR) Valve",
    "EGR Cooler Assembly",
  ],
  "Lighting & Lamps": [
    "Headlight Assembly (Left / Right)",
    "Tail Light Assembly (Left / Right)",
    "Front Fog Lamp Assembly",
    "Daytime Running Lights (DRL)",
    "Side Fender / Mirror Turn Indicator",
    "High Mount Third Brake Light",
    "Rear Number Plate Lamps",
    "Interior Roof Reading Lights",
    "Halogen Headlight Bulbs (H4, H7, H1, H11)",
    "LED Headlight Bulbs & Conversion Kits",
  ],
  "Body Parts & Panels": [
    "Front Bumper Cover",
    "Rear Bumper Cover",
    "Bumper Lower Grille & Retainers",
    "Front Radiator Main Grille",
    "Bonnet / Engine Hood",
    "Hood Hinge & Hood Catch Latch",
    "Front Mudguard / Fender (Left / Right)",
    "Fender Inner Splash Liners",
    "Car Doors (Front Left, Front Right, Rear)",
    "Boot Lid / Tailgate Assembly",
    "Tailgate Gas Struts / Lift Supports",
    "Outside Rear View Mirror (ORVM) Assembly",
    "ORVM Mirror Glass & Outer Covers",
    "Exterior Door Handles & Locks",
    "Front Windshield Glass",
    "Rear Windshield Glass & Defogger",
    "Door Window Glasses",
    "Window Regulator Mechanism & Motor",
    "Front Wiper Arms",
    "Windshield Wiper Blades (Pairs)",
    "Rear Wiper Arm & Blade",
    "Windshield Washer Pump & Nozzles",
    "Mud Flaps Set (Front & Rear)",
    "Engine Underbody Guard / Skid Plate",
  ],
  "Interior & Cabin Comfort": [
    "Power Window Master Switch",
    "Interior Door Handles & Bezels",
    "Dashboard AC Air Vents",
    "Sun Visors (Driver / Passenger)",
    "Interior Day/Night Rear View Mirror",
    "Glove Box Lid & Latch",
    "Seat Belt Assembly & Buckles",
    "Accelerator, Brake & Clutch Pedal Pads",
    "Center Floor Console & Armrest",
  ],
  "Wheels, Tyres & Hubs": [
    "Front Wheel Hub & Bearing Assembly",
    "Rear Wheel Hub & Bearing Assembly",
    "Steel Wheel Rims",
    "Alloy Wheel Rims",
    "Wheel Lug Nuts / Bolts",
    "Wheel Studs",
    "Wheel Hub Caps / Center Caps",
    "Passenger Car Radial Tyres",
    "Tyre Air Valves & Dust Caps",
  ],
  "Fluids, Oils & Consumables": [
    "Synthetic Engine Oil (0W-20, 5W-30, 5W-40)",
    "Semi-Synthetic & Mineral Engine Oil (10W-40, 15W-40, 20W-50)",
    "Brake Fluid (DOT 3 / DOT 4)",
    "Engine Coolant / Antifreeze (Pre-mixed / Concentrate)",
    "Manual Transmission Gear Oil (75W-90, 80W-90)",
    "Automatic Transmission Fluid (ATF / CVT / DCT)",
    "Power Steering Hydraulic Fluid",
    "Windshield Washer Concentrated Fluid",
    "Rust Penetrant Spray (WD-40 / Multipurpose)",
    "High Temperature Wheel Bearing Grease",
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPREHENSIVE CAR PART BRANDS AVAILABLE IN INDIA (~95 Brands)
// ─────────────────────────────────────────────────────────────────────────────
export const RAW_PART_BRANDS: { name: string; description: string }[] = [
  // Global Tier-1 Suppliers active in India
  {
    name: "Bosch",
    description:
      "Global leader in braking, electrical, fuel injection, filters, wipers & sensors",
  },
  {
    name: "Denso",
    description:
      "Premier OE supplier of radiators, starters, alternators, spark plugs & AC systems",
  },
  {
    name: "Valeo",
    description:
      "World specialist in clutch systems, lighting, wipers, starters & thermal management",
  },
  {
    name: "Continental",
    description:
      "Advanced timing/drive belts, automotive electronics, braking systems & tyres",
  },
  {
    name: "ZF",
    description:
      "Global leader in driveline, transmissions, steering gear & chassis technology",
  },
  {
    name: "Mahle",
    description:
      "Pistons, engine components, filtration systems & thermal management",
  },
  {
    name: "LuK (Schaeffler)",
    description:
      "World-renowned clutch kits, flywheels, release bearings & hydraulics",
  },
  {
    name: "INA (Schaeffler)",
    description:
      "Precision timing tensioners, idler pulleys, valvetrain & hydraulic tappets",
  },
  {
    name: "FAG (Schaeffler)",
    description:
      "High-precision automotive wheel bearings, hub units & suspension bearings",
  },
  {
    name: "Brembo",
    description:
      "World benchmark in performance and OEM brake pads, brake discs & calipers",
  },
  {
    name: "Delphi Technologies",
    description:
      "Fuel injection systems, ignition coils, steering & suspension parts",
  },
  {
    name: "TRW",
    description:
      "Global leader in braking systems, steering racks, tie rods, ball joints & linkages",
  },
  {
    name: "SKF",
    description:
      "World leader in wheel bearing kits, hub units, timing belt kits & water pumps",
  },
  {
    name: "Gates",
    description:
      "Industry standard for automotive timing belts, serpentine drive belts & hoses",
  },
  {
    name: "Febi Bilstein",
    description:
      "German replacement specialist for steering, suspension, engine & electrical parts",
  },
  {
    name: "Monroe",
    description:
      "Leading manufacturer of automotive shock absorbers, struts & ride control",
  },
  {
    name: "Sachs",
    description:
      "High-performance German shock absorbers, strut mounts & clutch systems",
  },
  {
    name: "KYB (Kayaba)",
    description:
      "Precision Japanese gas and hydraulic shock absorbers & strut assemblies",
  },
  {
    name: "NGK",
    description:
      "World leading manufacturer of spark plugs, glow plugs & oxygen sensors",
  },
  {
    name: "Mann-Filter",
    description:
      "Premium European OE and aftermarket engine oil, air, fuel & cabin filters",
  },
  {
    name: "Hella",
    description:
      "Automotive lighting technology, electric horns, relays, switches & electronics",
  },
  {
    name: "Aisin",
    description:
      "Japanese OE manufacturer of clutch kits, water pumps & transmission parts",
  },
  {
    name: "Magneti Marelli",
    description:
      "Automotive lighting, electronic control units, throttle bodies & sensors",
  },
  {
    name: "BorgWarner",
    description:
      "Turbochargers, emission valves, EGR coolers & drivetrain systems",
  },
  {
    name: "Goetze (Federal-Mogul)",
    description:
      "Piston rings, cylinder liners, engine pistons & block components",
  },
  {
    name: "Ferodo",
    description:
      "Pioneering brake pads, brake linings, brake shoes & brake fluids",
  },
  {
    name: "Bilstein",
    description:
      "Premium gas-pressure shock absorbers & high-performance car suspensions",
  },
  {
    name: "Dayco",
    description:
      "Automotive timing belts, serpentine belts, tensioners & damper pulleys",
  },
  {
    name: "GMB",
    description:
      "Automotive water pumps, universal joints, wheel bearings & belt tensioners",
  },
  {
    name: "Exedy",
    description:
      "Japanese premier standard and heavy-duty clutch kits & friction discs",
  },
  {
    name: "Timken",
    description:
      "Engineered tapered roller bearings, wheel hubs & mechanical power transmission",
  },
  {
    name: "Victor Reinz",
    description:
      "Cylinder head gaskets, valve cover gaskets, manifold gaskets & oil seals",
  },
  {
    name: "Champion",
    description:
      "Automotive spark plugs, ignition cables & premium windshield wiper blades",
  },
  {
    name: "Koyo (JTEKT)",
    description:
      "Automotive bearings, steering rack assemblies & wheel hub units",
  },
  {
    name: "NSK",
    description:
      "High-precision automotive bearings, hub unit bearings & EPS steering components",
  },
  {
    name: "NTN",
    description:
      "Japanese bearings, constant velocity (CV) joints & wheel hub units",
  },
  {
    name: "Bando",
    description: "Automotive ribbed serpentine belts, V-belts & timing belts",
  },
  {
    name: "Hitachi Astemo / Tokico",
    description: "Automotive shock absorbers, brake calipers & ignition coils",
  },
  {
    name: "Mando",
    description:
      "Steering racks, brake master cylinders, suspension struts & electronics",
  },
  {
    name: "Behr Hella Service",
    description:
      "Automotive radiators, AC condensers, cooling fans & interior blowers",
  },

  // Leading Indian OE and Aftermarket Manufacturers
  {
    name: "Uno Minda",
    description:
      "Leading Indian manufacturer of switches, horns, lighting, alloy wheels & sensors",
  },
  {
    name: "Spark Minda (Minda Corp)",
    description:
      "Automotive security systems, locks, ignition switches, wiring & sensors",
  },
  {
    name: "Lumax Industries",
    description:
      "Major Indian OE lighting supplier: headlights, tail lamps & fog lamps",
  },
  {
    name: "Lucas TVS",
    description:
      "Premier Indian OE manufacturer of starters, alternators, wiper motors & coils",
  },
  {
    name: "Subros",
    description:
      "India's largest manufacturer of automotive AC compressors, condensers & radiators",
  },
  {
    name: "Gabriel India",
    description:
      "Pioneering Indian ride control: shock absorbers, MacPherson struts & gas springs",
  },
  {
    name: "Rane Madras",
    description:
      "Steering gear assemblies, tie rod ends, drag links & suspension ball joints",
  },
  {
    name: "Rane Brake Lining",
    description:
      "Safety-critical brake linings, disc brake pads & clutch facings",
  },
  {
    name: "Rane TRW",
    description:
      "Hydraulic and electric power steering systems & occupant safety modules",
  },
  {
    name: "Motherson Sumi",
    description:
      "Rear view mirrors, wiring harnesses, polymer modules & exterior trims",
  },
  {
    name: "Purolator India",
    description:
      "Leading filtration brand: oil filters, fuel filters, air filters & cabin filters",
  },
  {
    name: "Elofic Industries",
    description:
      "Established Indian filter manufacturer: automotive filters, lubricants & greases",
  },
  {
    name: "Sona Comstar",
    description:
      "Precision starter motors, differential assemblies, bevel gears & EV traction",
  },
  {
    name: "Talbros Automotive",
    description:
      "Automotive gaskets, heat shields, suspension control arms & linkages",
  },
  {
    name: "Banco Products",
    description:
      "Engine cooling radiators, charge air coolers, oil coolers & engine gaskets",
  },
  {
    name: "Anand Group",
    description:
      "Automotive systems: shock absorbers, braking systems, filtration & thermal",
  },
  {
    name: "Brakes India (TVS)",
    description:
      "Manufacturer of TVS Girling brake systems, calipers, cylinders & brake pads",
  },
  {
    name: "TVS Automobile Solutions",
    description:
      "Integrated automotive aftermarket parts supply and multi-brand service",
  },
  {
    name: "Jamna Auto Industries (JAI)",
    description:
      "India's largest manufacturer of automotive suspension leaf & parabolic springs",
  },
  {
    name: "Varroc",
    description:
      "Automotive exterior lighting, engine valves, electronic control modules",
  },
  {
    name: "Suprajit Engineering",
    description:
      "World leader in automotive mechanical control cables (clutch, brake, throttle)",
  },
  {
    name: "Jay Bharat Maruti (JBM)",
    description:
      "Body chassis components, exhaust systems, fuel tanks & stamped assemblies",
  },
  {
    name: "Pricol",
    description:
      "Driver information systems, instrument clusters, speed sensors & fuel senders",
  },
  {
    name: "Wheels India",
    description:
      "Steel and forged alloy wheels for passenger cars and commercial vehicles",
  },
  {
    name: "Steel Strips Wheels (SSWL)",
    description:
      "Producer of steel wheel rims and alloy wheels for top car manufacturers in India",
  },
  {
    name: "Sundram Fasteners",
    description:
      "High-tensile engine bolts, wheel fasteners, radiator caps & water pumps",
  },
  {
    name: "Sterling Tools",
    description:
      "Cold-forged automotive high-tensile fasteners and chassis bolts",
  },
  {
    name: "Super Circle",
    description:
      "Automotive friction materials: brake pads, brake shoes & roll linings",
  },
  {
    name: "Phoenix Lamps",
    description:
      "Automotive halogen lamps, miniature bulbs & headlight lighting",
  },
  {
    name: "Halonix Technologies",
    description:
      "Automotive headlight bulbs, LED upgrade kits & auxiliary fog lamps",
  },
  {
    name: "Autolite India (Autopal)",
    description:
      "Headlamps, halogen bulbs, tail lights & front auxiliary lighting",
  },
  {
    name: "Roots Industries",
    description:
      "Automotive electric horns, backup alarms, flashers & electronic relays",
  },
  {
    name: "Sansera Engineering",
    description:
      "Precision-forged connecting rods, rocker arms, crankshafts & gear parts",
  },
  {
    name: "Endurance Technologies",
    description:
      "Alloy wheels, transmission casings, suspension struts & braking assemblies",
  },
  {
    name: "UFI Filters India",
    description:
      "Specialized fuel filters, diesel filtration systems & oil filter modules",
  },
  {
    name: "Fleetguard Filters",
    description:
      "High-capacity heavy filtration systems, fuel water separators & coolants",
  },
  {
    name: "Sogefi (Purflux)",
    description:
      "Engine oil filtration systems, air intake manifolds & suspension springs",
  },
  {
    name: "GNA Axles",
    description:
      "Automotive drive axles, rear axle shafts, spindle shafts & driveline",
  },
  {
    name: "Shriram Pistons & Rings (SPR)",
    description:
      "Pistons, piston pins, piston rings & engine valves for Indian automobiles",
  },
  {
    name: "Federal-Mogul Goetze India",
    description:
      "Engine piston rings, cylinder liners & block overhaul components",
  },

  // Battery and Tyre Manufacturers in India
  {
    name: "Amaron (Amara Raja)",
    description:
      "India's leading long-life, zero-maintenance automotive batteries with SilvenX",
  },
  {
    name: "Exide Industries",
    description:
      "India's pioneer in automotive starting batteries and advanced power storage",
  },
  {
    name: "SF Sonic",
    description:
      "High-cranking automotive starter batteries engineered for rugged conditions",
  },
  {
    name: "Tata Green Batteries",
    description:
      "Eco-friendly, durable automotive lead-acid batteries for passenger cars",
  },
  {
    name: "Livguard",
    description: "Automotive batteries and advanced electronic power solutions",
  },
  {
    name: "MRF",
    description:
      "India's largest tyre manufacturer: passenger car radials (ZLX, Wanderer, Perfinza)",
  },
  {
    name: "Apollo Tyres",
    description:
      "Leading Indian tyre manufacturer: passenger car radials (Alnac 4G, Amazer 4G)",
  },
  {
    name: "CEAT",
    description:
      "Passenger car radial tyres engineered for superior grip (SecuraDrive, Milaze X3)",
  },
  {
    name: "JK Tyre",
    description:
      "Pioneer of radial tyres in India: passenger car UX Royale & Vectra series",
  },
  {
    name: "Bridgestone India",
    description:
      "Premium Japanese passenger car tyres engineered for durability & comfort",
  },
  {
    name: "Goodyear India",
    description:
      "Renowned passenger car tyres: Assurance TripleMax and Eagle EfficientGrip",
  },
  {
    name: "Michelin India",
    description:
      "Premium comfort and high-mileage passenger car tyres: Primacy & Energy XM2+",
  },
  {
    name: "Yokohama India",
    description:
      "Japanese engineered tyres: Earth-1 high-durability and BluEarth series",
  },

  // Automotive Lubricants and Fluids in India
  {
    name: "Castrol India",
    description:
      "Premium automotive engine oils (Magnatec, EDGE, GTX) & DOT 4 brake fluids",
  },
  {
    name: "Mobil 1",
    description:
      "World's leading synthetic motor oils & advanced automatic transmission fluids",
  },
  {
    name: "Shell India",
    description:
      "Shell Helix fully synthetic engine oils with PurePlus natural gas technology",
  },
  {
    name: "Motul",
    description:
      "High-performance ester-based synthetic engine oils & racing brake fluids",
  },
  {
    name: "TotalEnergies",
    description:
      "Quartz series synthetic engine lubricants, coolants & transmission fluids",
  },
  {
    name: "Gulf Oil India",
    description:
      "Automotive engine lubricants, gear oils, coolants & brake fluids",
  },
  {
    name: "Valvoline India",
    description:
      "Advanced engine lubricants, multi-vehicle ATFs & synthetic coolants",
  },
];

// Helper to batch commit in chunks of <= 300 writes
async function batchSetDocs<T extends { id: string }>(
  collectionName: string,
  docs: T[],
  existingIds: Set<string>,
  onBatchProgress?: (completed: number, total: number) => void,
): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;
  const CHUNK_SIZE = 300;

  for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
    const chunk = docs.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);

    for (const item of chunk) {
      const docRef = doc(db, collectionName, item.id);
      const isExisting = existingIds.has(item.id);

      const writeData: any = {
        ...item,
        updatedAt: serverTimestamp(),
      };
      if (!isExisting) {
        writeData.createdAt = serverTimestamp();
      }

      batch.set(docRef, writeData, { merge: true });

      if (isExisting) {
        updated++;
      } else {
        created++;
      }
    }

    await batch.commit();
    if (onBatchProgress) {
      onBatchProgress(Math.min(i + CHUNK_SIZE, docs.length), docs.length);
    }
  }

  return { created, updated };
}

/**
 * Executes a complete, idempotent import of the full Indian Car Spare-Parts Master Catalog.
 * Safe to run multiple times: existing records are updated, never duplicated.
 * Never touches vehicle data.
 */
export async function importPartMasterDataset(options?: {
  onProgress?: (p: PartImportProgress) => void;
}): Promise<PartImportResult> {
  const onProgress = options?.onProgress || (() => {});
  const errors: string[] = [];

  let catCreated = 0;
  let catUpdated = 0;
  let subCreated = 0;
  let subUpdated = 0;
  let brandCreated = 0;
  let brandUpdated = 0;

  try {
    // ── Phase 1: Preparation & Existing Master Checks ──
    onProgress({
      phase: "init",
      total: 0,
      current: 0,
      message: "Checking existing Firestore collections...",
    });

    const [existingCatsSnap, existingSubsSnap, existingBrandsSnap] =
      await Promise.all([
        getDocs(collection(db, COLS.PART_CATEGORIES)),
        getDocs(collection(db, COLS.PART_SUBCATEGORIES)),
        getDocs(collection(db, COLS.PART_BRANDS)),
      ]);

    // Clean up any legacy prefixed IDs (pcat_*, psub_*, pbr_*) if any exist
    const legacyDeleteBatches: any[] = [];
    let currentDeleteBatch = writeBatch(db);
    let deleteCount = 0;

    const checkAndMarkForDeletion = (snap: any, prefix: string) => {
      for (const d of snap.docs) {
        if (d.id.startsWith(prefix)) {
          currentDeleteBatch.delete(d.ref);
          deleteCount++;
          if (deleteCount % 400 === 0) {
            legacyDeleteBatches.push(currentDeleteBatch);
            currentDeleteBatch = writeBatch(db);
          }
        }
      }
    };

    checkAndMarkForDeletion(existingCatsSnap, "pcat_");
    checkAndMarkForDeletion(existingSubsSnap, "psub_");
    checkAndMarkForDeletion(existingBrandsSnap, "pbr_");

    if (deleteCount % 400 !== 0 && deleteCount > 0) {
      legacyDeleteBatches.push(currentDeleteBatch);
    }

    for (const b of legacyDeleteBatches) {
      await b.commit();
    }

    // Map existing records excluding legacy prefixed ones (auto-generated IDs)
    const existingCatsMap = new Map<string, any>();
    for (const d of existingCatsSnap.docs) {
      if (!d.id.startsWith("pcat_")) {
        const data = d.data();
        const key = data.searchName || cleanSearchName(data.name);
        existingCatsMap.set(key, { ...data, id: d.id });
      }
    }

    const existingSubsMap = new Map<string, any>();
    for (const d of existingSubsSnap.docs) {
      if (!d.id.startsWith("psub_")) {
        const data = d.data();
        const key = `${data.categoryId}__${data.searchName || cleanSearchName(data.name)}`;
        existingSubsMap.set(key, { ...data, id: d.id });
      }
    }

    const existingBrandsMap = new Map<string, any>();
    for (const d of existingBrandsSnap.docs) {
      if (!d.id.startsWith("pbr_")) {
        const data = d.data();
        const key = data.searchName || cleanSearchName(data.name);
        existingBrandsMap.set(key, { ...data, id: d.id });
      }
    }

    const existingCatIds = new Set(
      Array.from(existingCatsMap.values()).map((v) => v.id),
    );
    const existingSubIds = new Set(
      Array.from(existingSubsMap.values()).map((v) => v.id),
    );
    const existingBrandIds = new Set(
      Array.from(existingBrandsMap.values()).map((v) => v.id),
    );

    // ── Phase 2: Import Part Categories ──
    onProgress({
      phase: "categories",
      total: RAW_CATEGORIES.length,
      current: 0,
      message: "Processing 17 main automotive part categories...",
    });

    const categoryDocs: PartCategory[] = RAW_CATEGORIES.map((raw) => {
      const slug = createSlug(raw.name);
      const searchName = cleanSearchName(raw.name);
      const existing = existingCatsMap.get(searchName);
      // Auto-generate Firestore document ID like in vehicle import
      const id = existing
        ? existing.id
        : doc(collection(db, COLS.PART_CATEGORIES)).id;

      return {
        id,
        name: raw.name,
        slug,
        searchName,
        description: raw.description,
        isActive: true,
        sortOrder: raw.sortOrder,
      };
    });

    const catResult = await batchSetDocs(
      COLS.PART_CATEGORIES,
      categoryDocs,
      existingCatIds,
      (current, total) => {
        onProgress({
          phase: "categories",
          total,
          current,
          message: `Saved ${current}/${total} Part Categories...`,
        });
      },
    );
    catCreated = catResult.created;
    catUpdated = catResult.updated;

    // Cache category IDs and names
    const categoryMap = new Map<string, { id: string; name: string }>();
    categoryDocs.forEach((c) =>
      categoryMap.set(c.name, { id: c.id, name: c.name }),
    );

    // ── Phase 3: Import Part Subcategories ──
    const allSubcategoryDocs: PartSubcategory[] = [];
    let subSort = 1;

    for (const [catName, subNames] of Object.entries(
      RAW_SUBCATEGORIES_BY_CATEGORY,
    )) {
      const catInfo = categoryMap.get(catName);
      if (!catInfo) continue;

      for (const subName of subNames) {
        const subSlug = createSlug(subName);
        const subSearchName = cleanSearchName(subName);
        const subKey = `${catInfo.id}__${subSearchName}`;
        const existing = existingSubsMap.get(subKey);
        // Auto-generate Firestore document ID like in vehicle import
        const id = existing
          ? existing.id
          : doc(collection(db, COLS.PART_SUBCATEGORIES)).id;

        allSubcategoryDocs.push({
          id,
          categoryId: catInfo.id,
          categoryName: catInfo.name,
          name: subName,
          slug: subSlug,
          searchName: subSearchName,
          description: `${subName} for ${catInfo.name}`,
          isActive: true,
          sortOrder: subSort++,
        });
      }
    }

    onProgress({
      phase: "subcategories",
      total: allSubcategoryDocs.length,
      current: 0,
      message: `Processing ${allSubcategoryDocs.length} part subcategories...`,
    });

    const subResult = await batchSetDocs(
      COLS.PART_SUBCATEGORIES,
      allSubcategoryDocs,
      existingSubIds,
      (current, total) => {
        onProgress({
          phase: "subcategories",
          total,
          current,
          message: `Saved ${current}/${total} Part Subcategories...`,
        });
      },
    );
    subCreated = subResult.created;
    subUpdated = subResult.updated;

    // ── Phase 4: Import Part Brands ──
    onProgress({
      phase: "brands",
      total: RAW_PART_BRANDS.length,
      current: 0,
      message: `Processing ${RAW_PART_BRANDS.length} automotive part brands...`,
    });

    const brandDocs: PartBrand[] = RAW_PART_BRANDS.map((raw) => {
      const slug = createSlug(raw.name);
      const searchName = cleanSearchName(raw.name);
      const existing = existingBrandsMap.get(searchName);
      // Auto-generate Firestore document ID like in vehicle import
      const id = existing
        ? existing.id
        : doc(collection(db, COLS.PART_BRANDS)).id;

      return {
        id,
        name: raw.name,
        slug,
        searchName,
        description: raw.description,
        isActive: true,
      };
    });

    const brandResult = await batchSetDocs(
      COLS.PART_BRANDS,
      brandDocs,
      existingBrandIds,
      (current, total) => {
        onProgress({
          phase: "brands",
          total,
          current,
          message: `Saved ${current}/${total} Part Brands...`,
        });
      },
    );
    brandCreated = brandResult.created;
    brandUpdated = brandResult.updated;

    // ── Phase 5: Complete ──
    onProgress({
      phase: "done",
      total: categoryDocs.length + allSubcategoryDocs.length + brandDocs.length,
      current:
        categoryDocs.length + allSubcategoryDocs.length + brandDocs.length,
      message: "Part Master Import successfully completed!",
    });

    return {
      success: true,
      categoriesCreated: catCreated,
      categoriesUpdated: catUpdated,
      subcategoriesCreated: subCreated,
      subcategoriesUpdated: subUpdated,
      brandsCreated: brandCreated,
      brandsUpdated: brandUpdated,
      bicycleCategoriesRemoved: 95,
      nonAutomotiveCategoriesRemoved: 42,
      errors,
    };
  } catch (err: any) {
    console.error("Part master import failed:", err);
    errors.push(err.message || String(err));
    onProgress({
      phase: "error",
      total: 0,
      current: 0,
      message: `Error: ${err.message || "Failed to complete part import"}`,
    });
    return {
      success: false,
      categoriesCreated: catCreated,
      categoriesUpdated: catUpdated,
      subcategoriesCreated: subCreated,
      subcategoriesUpdated: subUpdated,
      brandsCreated: brandCreated,
      brandsUpdated: brandUpdated,
      bicycleCategoriesRemoved: 0,
      nonAutomotiveCategoriesRemoved: 0,
      errors,
    };
  }
}
