export interface UpgradeValueContext {
  income?: number;
  clickPower?: number;
}

export interface Upgrade {
  id: number;
  name: string;
  description: string;
  type: string;
  baseCost: number;
  baseValue: number;
  getValue: (context: UpgradeValueContext) => number;
}

export const UpgradeType = {
  PASSIVE: "passive",
  CLICK: "click",
};

const flatUpgradeValue = function (
  this: Upgrade,
): number {
  return this.baseValue;
};

const percentIncomeUpgradeValue = function (
  this: Upgrade,
  context: UpgradeValueContext,
): number {
  return (this.baseValue / 100) * context.income!;
};

export const upgradeData: Upgrade[] = [
  {
    id: 0,
    name: "Drill Hardening",
    description:
      "Uses a novel alloy to harden the drill bit and increase the amount of ore gathered per click.",
    type: "click",
    baseCost: 100,
    baseValue: 1,
    getValue: flatUpgradeValue,
  },
  {
    id: 6,
    name: "Drill Cooling",
    description:
      "Implements a cooling system to reduce overheating, allowing for more efficient drilling.",
    type: "click",
    baseCost: 2000,
    baseValue: 10,
    getValue: percentIncomeUpgradeValue,
  },
  {
    id: 1,
    name: "Ore Extractor",
    description: "Automates ore extraction using advanced machinery.",
    type: "passive",
    baseCost: 10,
    baseValue: 0.25,
    getValue: flatUpgradeValue,
  },
  {
    id: 2,
    name: "Centrifuge",
    description: "Separates uranium isotopes through rapid spinning.",
    type: "passive",
    baseCost: 100,
    baseValue: 3,
    getValue: flatUpgradeValue,
  },
  {
    id: 3,
    name: "Enrichment Facility",
    description: "Processes uranium to increase the concentration of U-235.",
    type: "passive",
    baseCost: 1500,
    baseValue: 30,
    getValue: flatUpgradeValue,
  },
  {
    id: 4,
    name: "Fuel Rod Plant",
    description: "Manufactures fuel rods for nuclear reactors.",
    type: "passive",
    baseCost: 100000,
    baseValue: 500,
    getValue: flatUpgradeValue,
  },
  {
    id: 5,
    name: "Fission Reactor",
    description: "Generates massive amounts of energy through nuclear fission.",
    type: "passive",
    baseCost: 1000000,
    baseValue: 2500,
    getValue: flatUpgradeValue,
  },
];
