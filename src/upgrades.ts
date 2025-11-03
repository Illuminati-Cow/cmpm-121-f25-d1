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
  getValue(context: UpgradeValueContext): number;
  getCost(): number;
}

export type PurchasedUpgrade = Upgrade & {
  level: number;
};

export const UpgradeType = {
  PASSIVE: "passive",
  CLICK: "click",
};

const clickCostMultiplier = 3.0;
const passiveCostMultiplier = 1.15;

const flatUpgradeValue = function (
  this: PurchasedUpgrade,
): number {
  return this.baseValue * (this.level || 0);
};

const percentIncomeUpgradeValue = function (
  this: PurchasedUpgrade,
  context: UpgradeValueContext,
): number {
  return (this.baseValue * (this.level || 0)) * context.income!;
};

const getClickUpgradeCost = function (
  this: PurchasedUpgrade,
): number {
  return this.baseCost * Math.pow(clickCostMultiplier, this.level || 0);
};

const getPassiveUpgradeCost = function (
  this: PurchasedUpgrade,
): number {
  return this.baseCost * Math.pow(passiveCostMultiplier, this.level || 0);
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
    getCost: getClickUpgradeCost,
  },
  {
    id: 6,
    name: "Drill Cooling",
    description:
      "Implements a cooling system to reduce overheating, allowing for more efficient drilling.",
    type: "click",
    baseCost: 2000,
    baseValue: 0.05,
    getValue: percentIncomeUpgradeValue,
    getCost: getClickUpgradeCost,
  },
  {
    id: 1,
    name: "Ore Extractor",
    description: "Automates ore extraction using advanced machinery.",
    type: "passive",
    baseCost: 10,
    baseValue: 0.25,
    getValue: flatUpgradeValue,
    getCost: getPassiveUpgradeCost,
  },
  {
    id: 2,
    name: "Centrifuge",
    description: "Separates uranium isotopes through rapid spinning.",
    type: "passive",
    baseCost: 100,
    baseValue: 3,
    getValue: flatUpgradeValue,
    getCost: getPassiveUpgradeCost,
  },
  {
    id: 3,
    name: "Enrichment Facility",
    description: "Processes uranium to increase the concentration of U-235.",
    type: "passive",
    baseCost: 1500,
    baseValue: 30,
    getValue: flatUpgradeValue,
    getCost: getPassiveUpgradeCost,
  },
  {
    id: 4,
    name: "Fuel Rod Plant",
    description: "Manufactures fuel rods for nuclear reactors.",
    type: "passive",
    baseCost: 100000,
    baseValue: 500,
    getValue: flatUpgradeValue,
    getCost: getPassiveUpgradeCost,
  },
  {
    id: 5,
    name: "Fission Reactor",
    description: "Generates massive amounts of energy through nuclear fission.",
    type: "passive",
    baseCost: 1000000,
    baseValue: 2500,
    getValue: flatUpgradeValue,
    getCost: getPassiveUpgradeCost,
  },
];
