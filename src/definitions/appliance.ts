export type Appliance = {
    applianceInfo: ApplianceInfo;
    capabilities: Capabilities;
};

export type ApplianceInfo = {
    serialNumber: string;
    pnc: string;
    brand: string;
    deviceType: string;
    model: string;
    variant: string;
    colour: string;
};

export type Capabilities = Record<string, unknown>;
