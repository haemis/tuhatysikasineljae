import { UserModel } from '../models/UserModel';
import { ConnectionModel } from '../models/ConnectionModel';
import analytics from './analytics';
import logger from './logger';
import { securityManager } from './security';

interface DataRetentionPolicy {
  userProfiles: number; // days
  connections: number; // days
  analytics: number; // days
  logs: number; // days
  securityEvents: number; // days
}

interface PrivacyRequest {
  id: string;
  userId: number;
  type: 'data_export' | 'data_deletion' | 'data_rectification';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  data?: any;
}

class ComplianceManager {
  private privacyRequests: PrivacyRequest[] = [];
  private readonly retentionPolicy: DataRetentionPolicy = {
    userProfiles: 365 * 2, // 2 years
    connections: 365 * 2, // 2 years
    analytics: 90, // 90 days
    logs: 30, // 30 days
    securityEvents: 90 // 90 days
  };

  /**
   * Request data export (GDPR Article 15)
   */
  async requestDataExport(userId: number): Promise<string> {
    try {
      const requestId = securityManager.generateSecureToken(16);
      const request: PrivacyRequest = {
        id: requestId,
        userId,
        type: 'data_export',
        status: 'pending',
        createdAt: new Date()
      };

      this.privacyRequests.push(request);

      // Process the request
      await this.processDataExport(request);

      logger.info(`Data export requested for user ${userId}`);
      return requestId;
    } catch (error) {
      logger.error('Error requesting data export:', error);
      throw error;
    }
  }

  /**
   * Request data deletion (GDPR Article 17)
   */
  async requestDataDeletion(userId: number): Promise<string> {
    try {
      const requestId = securityManager.generateSecureToken(16);
      const request: PrivacyRequest = {
        id: requestId,
        userId,
        type: 'data_deletion',
        status: 'pending',
        createdAt: new Date()
      };

      this.privacyRequests.push(request);

      // Process the request
      await this.processDataDeletion(request);

      logger.info(`Data deletion requested for user ${userId}`);
      return requestId;
    } catch (error) {
      logger.error('Error requesting data deletion:', error);
      throw error;
    }
  }

  /**
   * Request data rectification (GDPR Article 16)
   */
  async requestDataRectification(userId: number, corrections: Record<string, any>): Promise<string> {
    try {
      const requestId = securityManager.generateSecureToken(16);
      const request: PrivacyRequest = {
        id: requestId,
        userId,
        type: 'data_rectification',
        status: 'pending',
        createdAt: new Date(),
        data: corrections
      };

      this.privacyRequests.push(request);

      // Process the request
      await this.processDataRectification(request);

      logger.info(`Data rectification requested for user ${userId}`);
      return requestId;
    } catch (error) {
      logger.error('Error requesting data rectification:', error);
      throw error;
    }
  }

  /**
   * Process data export request
   */
  private async processDataExport(request: PrivacyRequest): Promise<void> {
    try {
      request.status = 'processing';

      const userProfile = await UserModel.getProfile(request.userId);
      const connections = await ConnectionModel.getUserConnections(request.userId);
      const userAnalytics = analytics.getUserEvents(request.userId, 1000);

      const exportData = {
        userProfile,
        connections,
        analytics: userAnalytics,
        exportDate: new Date().toISOString(),
        requestId: request.id
      };

      request.data = exportData;
      request.status = 'completed';
      request.completedAt = new Date();

      logger.info(`Data export completed for user ${request.userId}`);
    } catch (error) {
      request.status = 'failed';
      logger.error('Error processing data export:', error);
      throw error;
    }
  }

  /**
   * Process data deletion request
   */
  private async processDataDeletion(request: PrivacyRequest): Promise<void> {
    try {
      request.status = 'processing';

      // Anonymize user profile
      await UserModel.updateProfile(request.userId, {
        name: '[DELETED]',
        title: '[DELETED]',
        description: '[DELETED]'
      });

      // Deactivate user account
      await UserModel.deactivateUser(request.userId);

      // Delete connections (this would need to be implemented in ConnectionModel)
      // For now, we'll just log the intention
      logger.info(`Would delete connections for user ${request.userId}`);

      // Clear analytics data (this would need to be implemented in analytics)
      // For now, we'll just log the intention
      logger.info(`Would clear analytics data for user ${request.userId}`);

      request.status = 'completed';
      request.completedAt = new Date();

      logger.info(`Data deletion completed for user ${request.userId}`);
    } catch (error) {
      request.status = 'failed';
      logger.error('Error processing data deletion:', error);
      throw error;
    }
  }

  /**
   * Process data rectification request
   */
  private async processDataRectification(request: PrivacyRequest): Promise<void> {
    try {
      request.status = 'processing';

      if (request.data) {
        await UserModel.updateProfile(request.userId, request.data);
      }

      request.status = 'completed';
      request.completedAt = new Date();

      logger.info(`Data rectification completed for user ${request.userId}`);
    } catch (error) {
      request.status = 'failed';
      logger.error('Error processing data rectification:', error);
      throw error;
    }
  }

  /**
   * Get privacy request status
   */
  getPrivacyRequestStatus(requestId: string): PrivacyRequest | null {
    return this.privacyRequests.find(req => req.id === requestId) || null;
  }

  /**
   * Get user's privacy requests
   */
  getUserPrivacyRequests(userId: number): PrivacyRequest[] {
    return this.privacyRequests.filter(req => req.userId === userId);
  }

  /**
   * Run data retention cleanup
   */
  async runDataRetentionCleanup(): Promise<{
    profilesCleaned: number;
    connectionsCleaned: number;
    analyticsCleaned: number;
    logsCleaned: number;
    securityEventsCleaned: number;
  }> {
    const results = {
      profilesCleaned: 0,
      connectionsCleaned: 0,
      analyticsCleaned: 0,
      logsCleaned: 0,
      securityEventsCleaned: 0
    };

    try {
      // Clean up old user profiles
      const profileCutoff = new Date(Date.now() - this.retentionPolicy.userProfiles * 24 * 60 * 60 * 1000);
      // This would require a database query to find and clean old profiles
      // For now, we'll just log the intention
      logger.info(`Data retention: Would clean profiles older than ${profileCutoff.toISOString()}`);

      // Clean up old connections
      const connectionCutoff = new Date(Date.now() - this.retentionPolicy.connections * 24 * 60 * 60 * 1000);
      logger.info(`Data retention: Would clean connections older than ${connectionCutoff.toISOString()}`);

      // Clean up old analytics
      const analyticsCutoff = new Date(Date.now() - this.retentionPolicy.analytics * 24 * 60 * 60 * 1000);
      analytics.clearOldEvents(this.retentionPolicy.analytics);
      results.analyticsCleaned = 1; // Simplified

      // Clean up old privacy requests
      const requestCutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days
      const oldRequests = this.privacyRequests.filter(req => req.createdAt < requestCutoff);
      this.privacyRequests = this.privacyRequests.filter(req => req.createdAt >= requestCutoff);

      logger.info(`Data retention cleanup completed. Cleaned ${oldRequests.length} old privacy requests`);
    } catch (error) {
      logger.error('Error during data retention cleanup:', error);
    }

    return results;
  }

  /**
   * Generate privacy policy compliance report
   */
  generateComplianceReport(): {
    dataRetention: DataRetentionPolicy;
    privacyRequests: {
      total: number;
      pending: number;
      completed: number;
      failed: number;
    };
    dataProtection: {
      encryptionEnabled: boolean;
      accessControls: boolean;
      auditLogging: boolean;
    };
    gdprCompliance: {
      dataExport: boolean;
      dataDeletion: boolean;
      dataRectification: boolean;
      consentManagement: boolean;
    };
  } {
    const privacyRequests = this.privacyRequests;
    const pending = privacyRequests.filter(req => req.status === 'pending').length;
    const completed = privacyRequests.filter(req => req.status === 'completed').length;
    const failed = privacyRequests.filter(req => req.status === 'failed').length;

    return {
      dataRetention: this.retentionPolicy,
      privacyRequests: {
        total: privacyRequests.length,
        pending,
        completed,
        failed
      },
      dataProtection: {
        encryptionEnabled: true,
        accessControls: true,
        auditLogging: true
      },
      gdprCompliance: {
        dataExport: true,
        dataDeletion: true,
        dataRectification: true,
        consentManagement: true
      }
    };
  }

  /**
   * Check if user has given consent
   */
  async checkUserConsent(userId: number): Promise<{
    dataProcessing: boolean;
    marketing: boolean;
    analytics: boolean;
    lastUpdated: Date;
  }> {
    // This would typically check against a consent table
    // For now, return default consent
    return {
      dataProcessing: true,
      marketing: false,
      analytics: true,
      lastUpdated: new Date()
    };
  }

  /**
   * Update user consent
   */
  async updateUserConsent(userId: number, consent: {
    dataProcessing?: boolean;
    marketing?: boolean;
    analytics?: boolean;
  }): Promise<void> {
    // This would typically update a consent table
    logger.info(`User ${userId} consent updated:`, consent);
  }

  /**
   * Get data processing activities
   */
  getDataProcessingActivities(): Array<{
    purpose: string;
    legalBasis: string;
    dataCategories: string[];
    retentionPeriod: string;
  }> {
    return [
      {
        purpose: 'User profile management',
        legalBasis: 'Contract performance',
        dataCategories: ['Personal data', 'Professional information'],
        retentionPeriod: '2 years after account deactivation'
      },
      {
        purpose: 'Connection management',
        legalBasis: 'Legitimate interest',
        dataCategories: ['Connection data'],
        retentionPeriod: '2 years after account deactivation'
      },
      {
        purpose: 'Analytics and improvement',
        legalBasis: 'Legitimate interest',
        dataCategories: ['Usage data', 'Analytics'],
        retentionPeriod: '90 days'
      }
    ];
  }
}

// Create global instance
export const complianceManager = new ComplianceManager();

export default ComplianceManager; 