// services/conversionService.ts

// fix: Corrected imports to use the centralized types file, resolving type errors.
import { MeasurementUnit, ItemType, InvoiceLineItem, AddOnOption } from '../types';

const METERS_PER_FOOT = 0.3048;
const CM_PER_METER = 100;
const MM_PER_METER = 1000;
const INCHES_PER_FOOT = 12;

// Conversion factors to square meters for area units, or to meters for linear units.
export const CONVERSION_TO_BASE_UNIT: Record<MeasurementUnit, number> = {
    // Area units -> to sq_m
    [MeasurementUnit.SQ_M]: 1,
    [MeasurementUnit.SQ_FT]: METERS_PER_FOOT * METERS_PER_FOOT,
    [MeasurementUnit.SQ_CM]: (1 / CM_PER_METER) * (1 / CM_PER_METER),
    [MeasurementUnit.SQ_MM]: (1 / MM_PER_METER) * (1 / MM_PER_METER),
    [MeasurementUnit.SQ_IN]: (METERS_PER_FOOT / INCHES_PER_FOOT) * (METERS_PER_FOOT / INCHES_PER_FOOT),
    // Linear units -> to m
    [MeasurementUnit.M]: 1,
    [MeasurementUnit.CM]: 1 / CM_PER_METER,
    [MeasurementUnit.MM]: 1 / MM_PER_METER,
    [MeasurementUnit.FT]: METERS_PER_FOOT,
    [MeasurementUnit.IN]: METERS_PER_FOOT / INCHES_PER_FOOT,
};

export const isAreaUnit = (unit: MeasurementUnit) => unit.startsWith('sq_');
export const isLinearUnit = (unit: MeasurementUnit) => !isAreaUnit(unit);

export const calculateEquivalentPrices = (
    basePrice: number,
    baseUnit: MeasurementUnit
): Partial<Record<MeasurementUnit, number>> => {
    if (!isAreaUnit(baseUnit) || !basePrice || basePrice <= 0) {
        return {}; 
    }

    const pricePerSqMeter = basePrice / CONVERSION_TO_BASE_UNIT[baseUnit];

    const equivalentPrices: Partial<Record<MeasurementUnit, number>> = {};
    const areaUnits = (Object.values(MeasurementUnit) as MeasurementUnit[]).filter(u => isAreaUnit(u));
    
    areaUnits.forEach(unit => {
        equivalentPrices[unit] = pricePerSqMeter * CONVERSION_TO_BASE_UNIT[unit];
    });

    return equivalentPrices;
};

export const calculateCostUnitPrices = (
    totalPrice: number,
    length: number,
    width: number,
    unit: MeasurementUnit
): Partial<Record<MeasurementUnit, number>> => {
    if (!totalPrice || totalPrice <= 0 || !length || length <= 0 || !width || width <= 0 || !unit) {
        return {};
    }

    if (isAreaUnit(unit)) {
        console.error("calculateCostUnitPrices expects a linear unit for dimensions.");
        return {};
    }

    const lengthInMeters = length * CONVERSION_TO_BASE_UNIT[unit];
    const widthInMeters = width * CONVERSION_TO_BASE_UNIT[unit];
    const totalAreaInSqMeters = lengthInMeters * widthInMeters;

    if (totalAreaInSqMeters <= 0) {
        return {};
    }

    const costPerSqMeter = totalPrice / totalAreaInSqMeters;

    const equivalentPrices: Partial<Record<MeasurementUnit, number>> = {};
    const areaUnits = (Object.values(MeasurementUnit) as MeasurementUnit[]).filter(u => isAreaUnit(u));
    
    areaUnits.forEach(areaUnit => {
        equivalentPrices[areaUnit] = costPerSqMeter * CONVERSION_TO_BASE_UNIT[areaUnit];
    });

    return equivalentPrices;
};


export const convertToBaseUnits = (value: number, fromUnit: MeasurementUnit): number => {
    return value * (CONVERSION_TO_BASE_UNIT[fromUnit] || 1);
};

export const calculateBasePrice = (
    item: { 
        price: number; 
        type: ItemType; 
        measurementUnit?: MeasurementUnit; 
        unitPrices?: Partial<Record<MeasurementUnit, number>>; 
        minPrice?: number;
        addOnOptions?: AddOnOption[];
    },
    lineItem: { 
        length?: number; 
        width?: number; 
        unit?: MeasurementUnit; 
        quantity: number;
        selectedAddOnIds?: string[];
    }
): number => {
    // Calculate total add-on price
    const addOnsUnitPrice = (lineItem.selectedAddOnIds || []).reduce((sum, id) => {
        const option = (item.addOnOptions || []).find(opt => opt.id === id);
        return sum + (option?.price || 0);
    }, 0);

    const effectiveUnitPrice = item.price + addOnsUnitPrice;

    if (item.type !== ItemType.FIXED && item.measurementUnit) {
        const { length = 0, width = 0, unit: lineUnit, quantity } = lineItem;

        if (!lineUnit) {
            return 0; // Cannot calculate without a unit on the line item.
        }
        
        // Step 1: Calculate the area of the line item and convert it to SQUARE METERS.
        let areaInSqMeters: number;

        if (isAreaUnit(lineUnit)) {
            const area = length * (width > 0 ? width : 1);
            areaInSqMeters = area * CONVERSION_TO_BASE_UNIT[lineUnit];
        } else {
            const lengthInMeters = length * CONVERSION_TO_BASE_UNIT[lineUnit];
            const widthInMeters = width * CONVERSION_TO_BASE_UNIT[lineUnit];
            areaInSqMeters = lengthInMeters * widthInMeters;
        }

        // Step 2: Calculate the item's price per SQUARE METER from its base price.
        const pricePerSqMeter = effectiveUnitPrice / CONVERSION_TO_BASE_UNIT[item.measurementUnit];

        // Step 3: Calculate the final price.
        let calculatedPrice = areaInSqMeters * pricePerSqMeter * quantity;

        if (item.minPrice && calculatedPrice < item.minPrice) {
            return item.minPrice;
        }

        return calculatedPrice;
    }

    return effectiveUnitPrice * lineItem.quantity;
};
