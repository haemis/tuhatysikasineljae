import { Connection, ConnectionStatus, ConnectionRequest } from '../types';
export declare class ConnectionModel {
    static createConnectionRequest(requesterId: number, receiverId: number): Promise<Connection>;
    static getConnection(user1Id: number, user2Id: number): Promise<Connection | null>;
    static updateConnectionStatus(connectionId: string, status: ConnectionStatus): Promise<Connection | null>;
    static acceptConnection(requesterId: number, receiverId: number): Promise<Connection | null>;
    static declineConnection(requesterId: number, receiverId: number): Promise<Connection | null>;
    static getPendingRequests(userId: number, limit?: number, offset?: number): Promise<ConnectionRequest[]>;
    static getUserConnections(userId: number, limit?: number, offset?: number): Promise<ConnectionRequest[]>;
    static getMutualConnections(user1Id: number, user2Id: number): Promise<ConnectionRequest[]>;
    static getPendingRequestsCount(userId: number): Promise<number>;
    static getConnectionsCount(userId: number): Promise<number>;
    static removeConnection(user1Id: number, user2Id: number): Promise<boolean>;
}
//# sourceMappingURL=ConnectionModel.d.ts.map