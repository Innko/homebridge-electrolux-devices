export type ApplianceState = {
    applianceId: string;
    connectionState: ConnectionState;
    status: Status;
    properties: Properties;
};

type ConnectionState = 'Connected' | 'Disconnected';

type Status = 'enabled' | 'disabled';

type Properties = {
    reported: {
        /* Washing Machine */
        applianceState: WMApplianceState;
        doorState: DoorState;
        doorLock: DoorLock;
        timeToEnd: number;
        cyclePhase: string;
        uiLockMode: boolean;
        remoteControl: 'ENABLED' | 'DISABLED';
    };
};

type WMApplianceState =
    | 'RUNNING'
    | 'READY_TO_START'
    | 'PAUSED'
    | 'FINISHED'
    | 'CANCELLED'
    | 'COMPLETED';

type DoorState = 'OPEN' | 'CLOSED';
type DoorLock = 'ON' | 'OFF';
