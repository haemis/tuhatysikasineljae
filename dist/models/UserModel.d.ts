import { UserProfile, PrivacySettings, ProfileValidation } from '../types';
export declare class UserModel {
    static createProfile(profile: ProfileValidation & {
        telegram_id: number;
        username?: string;
    }): Promise<UserProfile>;
    static getProfile(telegramId: number): Promise<UserProfile | null>;
    static updateProfile(telegramId: number, updates: Partial<ProfileValidation>): Promise<UserProfile | null>;
    static updatePrivacySettings(telegramId: number, privacySettings: Partial<PrivacySettings>): Promise<UserProfile | null>;
    static searchUsers(query: string, limit?: number, offset?: number): Promise<UserProfile[]>;
    static getByUsername(username: string): Promise<UserProfile | null>;
    static deactivateUser(telegramId: number): Promise<boolean>;
    static userExists(telegramId: number): Promise<boolean>;
    static getTotalUsers(): Promise<number>;
}
//# sourceMappingURL=UserModel.d.ts.map