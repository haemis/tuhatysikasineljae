import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { TextInput, Button, Card, Avatar } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import apiClient, { UserProfile } from '../api/client';

interface ProfileScreenProps {
  userId: number;
  onProfileUpdate?: (profile: UserProfile) => void;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ userId, onProfileUpdate }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    description: '',
    github_username: '',
    linkedin_url: '',
    website_url: '',
    world_id: '',
  });

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const userProfile = await apiClient.getUserProfile(userId);
      setProfile(userProfile);
      setFormData({
        name: userProfile.name,
        title: userProfile.title,
        description: userProfile.description,
        github_username: userProfile.github_username || '',
        linkedin_url: userProfile.linkedin_url || '',
        website_url: userProfile.website_url || '',
        world_id: userProfile.world_id || '',
      });
    } catch (error) {
      Alert.alert('Error', apiClient.handleError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const updatedProfile = await apiClient.updateUserProfile(userId, formData);
      setProfile(updatedProfile);
      setEditing(false);
      onProfileUpdate?.(updatedProfile);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      Alert.alert('Error', apiClient.handleError(error));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        name: profile.name,
        title: profile.title,
        description: profile.description,
        github_username: profile.github_username || '',
        linkedin_url: profile.linkedin_url || '',
        website_url: profile.website_url || '',
        world_id: profile.world_id || '',
      });
    }
    setEditing(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="error" size={48} color="#FF3B30" />
        <Text style={styles.errorText}>Profile not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.profileCard}>
        <Card.Content>
          <View style={styles.header}>
            <Avatar.Text 
              size={80} 
              label={profile.name.charAt(0).toUpperCase()} 
              style={styles.avatar}
            />
            <View style={styles.headerInfo}>
              <Text style={styles.name}>{profile.name}</Text>
              <Text style={styles.title}>{profile.title}</Text>
              <Text style={styles.username}>@{profile.username || 'No username'}</Text>
            </View>
          </View>

          {editing ? (
            <View style={styles.editForm}>
              <TextInput
                label="Name"
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                style={styles.input}
                mode="outlined"
              />
              <TextInput
                label="Title"
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
                style={styles.input}
                mode="outlined"
              />
              <TextInput
                label="Description"
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                style={styles.input}
                mode="outlined"
                multiline
                numberOfLines={3}
              />
              <TextInput
                label="GitHub Username"
                value={formData.github_username}
                onChangeText={(text) => setFormData({ ...formData, github_username: text })}
                style={styles.input}
                mode="outlined"
              />
              <TextInput
                label="LinkedIn URL"
                value={formData.linkedin_url}
                onChangeText={(text) => setFormData({ ...formData, linkedin_url: text })}
                style={styles.input}
                mode="outlined"
              />
              <TextInput
                label="Website URL"
                value={formData.website_url}
                onChangeText={(text) => setFormData({ ...formData, website_url: text })}
                style={styles.input}
                mode="outlined"
              />
              <TextInput
                label="World ID"
                value={formData.world_id}
                onChangeText={(text) => setFormData({ ...formData, world_id: text })}
                style={styles.input}
                mode="outlined"
              />

              <View style={styles.buttonRow}>
                <Button
                  mode="outlined"
                  onPress={handleCancel}
                  style={[styles.button, styles.cancelButton]}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleSave}
                  style={[styles.button, styles.saveButton]}
                  loading={saving}
                  disabled={saving}
                >
                  Save
                </Button>
              </View>
            </View>
          ) : (
            <View style={styles.profileInfo}>
              <Text style={styles.description}>{profile.description}</Text>
              
              <View style={styles.links}>
                {profile.github_username && (
                  <TouchableOpacity style={styles.linkItem}>
                    <Icon name="code" size={20} color="#333" />
                    <Text style={styles.linkText}>@{profile.github_username}</Text>
                  </TouchableOpacity>
                )}
                
                {profile.linkedin_url && (
                  <TouchableOpacity style={styles.linkItem}>
                    <Icon name="business" size={20} color="#0077B5" />
                    <Text style={styles.linkText}>LinkedIn</Text>
                  </TouchableOpacity>
                )}
                
                {profile.website_url && (
                  <TouchableOpacity style={styles.linkItem}>
                    <Icon name="language" size={20} color="#4CAF50" />
                    <Text style={styles.linkText}>Website</Text>
                  </TouchableOpacity>
                )}
                
                {profile.world_id && (
                  <TouchableOpacity style={styles.linkItem}>
                    <Icon name="verified-user" size={20} color="#FF9800" />
                    <Text style={styles.linkText}>World ID Verified</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.privacyInfo}>
                <Text style={styles.privacyTitle}>Privacy Settings</Text>
                <View style={styles.privacyItem}>
                  <Icon 
                    name={profile.privacy_settings.profile_visible ? "visibility" : "visibility-off"} 
                    size={16} 
                    color="#666" 
                  />
                  <Text style={styles.privacyText}>
                    Profile {profile.privacy_settings.profile_visible ? 'Visible' : 'Hidden'}
                  </Text>
                </View>
                <View style={styles.privacyItem}>
                  <Icon 
                    name={profile.privacy_settings.allow_search ? "search" : "search-off"} 
                    size={16} 
                    color="#666" 
                  />
                  <Text style={styles.privacyText}>
                    Search {profile.privacy_settings.allow_search ? 'Enabled' : 'Disabled'}
                  </Text>
                </View>
                <View style={styles.privacyItem}>
                  <Icon 
                    name={profile.privacy_settings.allow_connections ? "people" : "people-outline"} 
                    size={16} 
                    color="#666" 
                  />
                  <Text style={styles.privacyText}>
                    Connections {profile.privacy_settings.allow_connections ? 'Allowed' : 'Blocked'}
                  </Text>
                </View>
              </View>

              <Button
                mode="contained"
                onPress={() => setEditing(true)}
                style={styles.editButton}
                icon="edit"
              >
                Edit Profile
              </Button>
            </View>
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#FF3B30',
  },
  profileCard: {
    margin: 16,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  title: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  username: {
    fontSize: 14,
    color: '#999',
    marginTop: 2,
  },
  editForm: {
    marginTop: 16,
  },
  input: {
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  button: {
    flex: 1,
    marginHorizontal: 8,
  },
  cancelButton: {
    borderColor: '#FF3B30',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  profileInfo: {
    marginTop: 16,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 20,
  },
  links: {
    marginBottom: 20,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  linkText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#007AFF',
  },
  privacyInfo: {
    marginBottom: 20,
  },
  privacyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  privacyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  privacyText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#666',
  },
  editButton: {
    backgroundColor: '#007AFF',
  },
});

export default ProfileScreen; 