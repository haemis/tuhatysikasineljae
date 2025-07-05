import crypto from 'crypto';
import logger from './logger';
import analytics from './analytics';

interface SecurityEvent {
  type: 'suspicious_activity' | 'rate_limit_violation' | 'malicious_input' | 'unauthorized_access';
  userId?: number;
  ip?: string;
  userAgent?: string;
  details: Record<string, any>;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface ThreatLevel {
  level: 'safe' | 'suspicious' | 'dangerous' | 'blocked';
  score: number;
  reasons: string[];
}

class SecurityManager {
  private securityEvents: SecurityEvent[] = [];
  private blockedUsers: Set<number> = new Set();
  private suspiciousIPs: Map<string, { count: number; lastSeen: Date }> = new Map();
  private readonly MAX_EVENTS = 1000;
  private readonly BLOCK_THRESHOLD = 10;
  private readonly SUSPICIOUS_THRESHOLD = 5;

  /**
   * Validate and sanitize user input
   */
  validateInput(input: string, type: 'text' | 'url' | 'username' | 'email'): { isValid: boolean; sanitized?: string; errors: string[] } {
    const errors: string[] = [];
    let sanitized = input.trim();

    // Check for empty input
    if (!sanitized) {
      errors.push('Input cannot be empty');
      return { isValid: false, errors };
    }

    // Check length limits
    if (sanitized.length > 1000) {
      errors.push('Input too long (max 1000 characters)');
      return { isValid: false, errors };
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /data:text\/html/gi,
      /vbscript:/gi,
      /<iframe/gi,
      /<object/gi,
      /<embed/gi
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(sanitized)) {
        errors.push('Suspicious content detected');
        this.logSecurityEvent('malicious_input', {
          input: sanitized,
          pattern: pattern.source,
          type
        });
        return { isValid: false, errors };
      }
    }

    // Type-specific validation
    switch (type) {
      case 'username':
        if (!/^[a-zA-Z0-9_]{3,20}$/.test(sanitized)) {
          errors.push('Username must be 3-20 characters, alphanumeric and underscore only');
        }
        break;
      
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(sanitized)) {
          errors.push('Invalid email format');
        }
        break;
      
      case 'url':
        try {
          const url = new URL(sanitized);
          if (!['http:', 'https:'].includes(url.protocol)) {
            errors.push('URL must use HTTP or HTTPS protocol');
          }
        } catch {
          errors.push('Invalid URL format');
        }
        break;
      
      case 'text':
        // Remove excessive whitespace
        sanitized = sanitized.replace(/\s+/g, ' ');
        break;
    }

    return {
      isValid: errors.length === 0,
      ...(errors.length === 0 && { sanitized }),
      errors
    };
  }

  /**
   * Check for suspicious activity
   */
  checkSuspiciousActivity(userId: number, action: string, metadata: Record<string, any> = {}): ThreatLevel {
    const reasons: string[] = [];
    let score = 0;

    // Check if user is blocked
    if (this.blockedUsers.has(userId)) {
      return {
        level: 'blocked',
        score: 100,
        reasons: ['User is blocked due to previous violations']
      };
    }

    // Check action frequency
    const recentEvents = this.getRecentEvents(userId, 5); // Last 5 minutes
    const actionCount = recentEvents.filter(e => e.details['action'] === action).length;

    if (actionCount > 20) {
      score += 30;
      reasons.push('High frequency of actions');
    } else if (actionCount > 10) {
      score += 15;
      reasons.push('Moderate frequency of actions');
    }

    // Check for unusual patterns
    if (action === 'search' && metadata['query'] && metadata['query'].length < 2) {
      score += 10;
      reasons.push('Very short search queries');
    }

    if (action === 'connect' && recentEvents.filter(e => e.details['action'] === 'connect').length > 5) {
      score += 20;
      reasons.push('Excessive connection requests');
    }

    // Check for rapid-fire actions
    const veryRecentEvents = this.getRecentEvents(userId, 1); // Last minute
    if (veryRecentEvents.length > 10) {
      score += 25;
      reasons.push('Rapid-fire actions detected');
    }

    // Determine threat level
    let level: 'safe' | 'suspicious' | 'dangerous' | 'blocked' = 'safe';
    if (score >= 80) {
      level = 'blocked';
      this.blockUser(userId);
    } else if (score >= 50) {
      level = 'dangerous';
    } else if (score >= 20) {
      level = 'suspicious';
    }

    // Log suspicious activity
    if (level !== 'safe') {
      this.logSecurityEvent('suspicious_activity', {
        action,
        score,
        reasons,
        ...metadata
      }, userId);
    }

    return { level, score, reasons };
  }

  /**
   * Check IP-based threats
   */
  checkIPThreat(ip: string): ThreatLevel {
    const reasons: string[] = [];
    let score = 0;

    const ipData = this.suspiciousIPs.get(ip);
    if (ipData) {
      const timeSinceLastSeen = Date.now() - ipData.lastSeen.getTime();
      const minutesSinceLastSeen = timeSinceLastSeen / (1000 * 60);

      // If same IP is making requests frequently
      if (ipData.count > this.BLOCK_THRESHOLD) {
        score = 100;
        reasons.push('IP blocked due to excessive requests');
      } else if (ipData.count > this.SUSPICIOUS_THRESHOLD) {
        score += 30;
        reasons.push('IP showing suspicious activity');
      }

      // Update IP data
      ipData.count++;
      ipData.lastSeen = new Date();
    } else {
      this.suspiciousIPs.set(ip, { count: 1, lastSeen: new Date() });
    }

    let level: 'safe' | 'suspicious' | 'dangerous' | 'blocked' = 'safe';
    if (score >= 80) {
      level = 'blocked';
    } else if (score >= 50) {
      level = 'dangerous';
    } else if (score >= 20) {
      level = 'suspicious';
    }

    return { level, score, reasons };
  }

  /**
   * Generate secure tokens
   */
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Hash sensitive data
   */
  hashData(data: string, salt?: string): string {
    const saltToUse = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(data, saltToUse, 1000, 64, 'sha512').toString('hex');
    return `${saltToUse}:${hash}`;
  }

  /**
   * Verify hashed data
   */
  verifyHash(data: string, hashedData: string): boolean {
    const [salt, hash] = hashedData.split(':');
    if (!salt || !hash) return false;
    const computedHash = crypto.pbkdf2Sync(data, salt, 1000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(computedHash, 'hex'));
  }

  /**
   * Encrypt sensitive data
   */
  encryptData(data: string, key: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-cbc', key);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt sensitive data
   */
  decryptData(encryptedData: string, key: string): string {
    const [ivHex, encrypted] = encryptedData.split(':');
    if (!ivHex || !encrypted) throw new Error('Invalid encrypted data format');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipher('aes-256-cbc', key);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Log security event
   */
  private logSecurityEvent(type: SecurityEvent['type'], details: Record<string, any>, userId?: number): void {
    const event: SecurityEvent = {
      type,
      ...(userId && { userId }),
      details,
      timestamp: new Date(),
      severity: this.calculateSeverity(type, details)
    };

    this.securityEvents.push(event);

    // Keep only recent events
    if (this.securityEvents.length > this.MAX_EVENTS) {
      this.securityEvents = this.securityEvents.slice(-this.MAX_EVENTS);
    }

    // Log to analytics
    analytics.track(userId || 0, `security_${type}`, details);

    // Log to console for monitoring
    logger.warn(`Security event: ${type}`, {
      userId,
      severity: event.severity,
      details
    });
  }

  /**
   * Calculate event severity
   */
  private calculateSeverity(type: SecurityEvent['type'], details: Record<string, any>): 'low' | 'medium' | 'high' | 'critical' {
    switch (type) {
      case 'malicious_input':
        return 'high';
      case 'unauthorized_access':
        return 'critical';
      case 'rate_limit_violation':
        return details['count'] > 50 ? 'high' : 'medium';
      case 'suspicious_activity':
        return details['score'] > 70 ? 'high' : 'medium';
      default:
        return 'low';
    }
  }

  /**
   * Block user
   */
  private blockUser(userId: number): void {
    this.blockedUsers.add(userId);
    logger.warn(`User ${userId} blocked due to security violations`);
  }

  /**
   * Unblock user
   */
  unblockUser(userId: number): void {
    this.blockedUsers.delete(userId);
    logger.info(`User ${userId} unblocked`);
  }

  /**
   * Get recent security events
   */
  getRecentEvents(userId?: number, minutes: number = 5): SecurityEvent[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.securityEvents.filter(event => 
      event.timestamp > cutoff && (!userId || event.userId === userId)
    );
  }

  /**
   * Get security statistics
   */
  getSecurityStats(): {
    totalEvents: number;
    blockedUsers: number;
    suspiciousIPs: number;
    recentEvents: SecurityEvent[];
    threatLevel: 'low' | 'medium' | 'high';
  } {
    const recentEvents = this.getRecentEvents(undefined, 60); // Last hour
    const criticalEvents = recentEvents.filter(e => e.severity === 'critical').length;
    const highEvents = recentEvents.filter(e => e.severity === 'high').length;

    let threatLevel: 'low' | 'medium' | 'high' = 'low';
    if (criticalEvents > 0 || highEvents > 10) {
      threatLevel = 'high';
    } else if (highEvents > 3 || recentEvents.length > 50) {
      threatLevel = 'medium';
    }

    return {
      totalEvents: this.securityEvents.length,
      blockedUsers: this.blockedUsers.size,
      suspiciousIPs: this.suspiciousIPs.size,
      recentEvents: recentEvents.slice(-10), // Last 10 events
      threatLevel
    };
  }

  /**
   * Clean up old data
   */
  cleanup(): void {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    // Clean up old events
    this.securityEvents = this.securityEvents.filter(e => e.timestamp > cutoff);
    
    // Clean up old IP data
    for (const [ip, data] of this.suspiciousIPs.entries()) {
      if (data.lastSeen < cutoff) {
        this.suspiciousIPs.delete(ip);
      }
    }

    logger.info('Security manager cleanup completed');
  }
}

// Create global instance
export const securityManager = new SecurityManager();

// Security middleware for Express (if needed)
export const securityMiddleware = (req: any, res: any, next: any) => {
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent');
  
  // Check IP threat
  const ipThreat = securityManager.checkIPThreat(ip);
  if (ipThreat.level === 'blocked') {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'");

  next();
};

export default SecurityManager; 