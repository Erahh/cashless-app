import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    FlatList,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/apiHelper';

export default function AddFriendScreen({ navigation }) {
    const [phone, setPhone] = useState('');
    const [friends, setFriends] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        loadFriends();
    }, []);

    const loadFriends = async () => {
        try {
            const response = await api('/friends/list');
            if (response.ok) {
                setFriends(response.friends || []);
            }
        } catch (error) {
            console.error('Error loading friends:', error);
        } finally {
            setLoading(false);
        }
    };

    const sendFriendRequest = async () => {
        if (!phone || phone.length < 10) {
            Alert.alert('Invalid Phone', 'Please enter a valid phone number');
            return;
        }

        setSearching(true);
        try {
            const response = await api('/friends/request', {
                method: 'POST',
                body: JSON.stringify({ phone: phone.trim() }),
            });

            if (response.ok) {
                Alert.alert('Success', `Friend request sent to ${response.friend.full_name}`);
                setPhone('');
                await loadFriends(); // Refresh list
            } else {
                Alert.alert('Error', response.error || 'Failed to send friend request');
            }
        } catch (error) {
            Alert.alert('Error', error.message || 'Something went wrong');
        } finally {
            setSearching(false);
        }
    };

    const acceptFriendRequest = async (connectionId, friendName) => {
        try {
            const response = await api(`/friends/accept/${connectionId}`, {
                method: 'POST',
            });

            if (response.ok) {
                Alert.alert('Success', `You are now friends with ${friendName}`);
                await loadFriends();
            } else {
                Alert.alert('Error', response.error || 'Failed to accept request');
            }
        } catch (error) {
            Alert.alert('Error', 'Something went wrong');
        }
    };

    const removeFriend = async (connectionId, friendName, isPending) => {
        Alert.alert(
            isPending ? 'Cancel Request?' : 'Remove Friend?',
            `Are you sure you want to ${isPending ? 'cancel request to' : 'remove'} ${friendName}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: isPending ? 'Cancel Request' : 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const response = await api(`/friends/${connectionId}`, {
                                method: 'DELETE',
                            });

                            if (response.ok) {
                                Alert.alert('Success', isPending ? 'Request cancelled' : 'Friend removed');
                                await loadFriends();
                            } else {
                                Alert.alert('Error', response.error || 'Something went wrong');
                            }
                        } catch (error) {
                            Alert.alert('Error', 'Something went wrong');
                        }
                    },
                },
            ]
        );
    };

    const renderFriendItem = ({ item }) => {
        const isPending = item.status === 'pending';
        const isIncoming = item.is_incoming;

        return (
            <View style={styles.friendItem}>
                <View style={styles.friendAvatar}>
                    <Ionicons name="person" size={24} color="#FFD36A" />
                </View>

                <View style={styles.friendInfo}>
                    <Text style={styles.friendName}>{item.friend_name}</Text>
                    <Text style={styles.friendPhone}>{item.friend_phone}</Text>
                    {isPending && (
                        <Text style={styles.friendStatus}>
                            {isIncoming ? 'Wants to be friends' : 'Request sent'}
                        </Text>
                    )}
                </View>

                <View style={styles.friendActions}>
                    {isPending && isIncoming ? (
                        <TouchableOpacity
                            style={styles.acceptButton}
                            onPress={() => acceptFriendRequest(item.connection_id, item.friend_name)}
                        >
                            <Text style={styles.acceptButtonText}>Accept</Text>
                        </TouchableOpacity>
                    ) : null}

                    <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => removeFriend(item.connection_id, item.friend_name, isPending && !isIncoming)}
                    >
                        <Ionicons
                            name={isPending && !isIncoming ? "close-circle" : "trash-outline"}
                            size={24}
                            color="#F44336"
                        />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const acceptedFriends = friends.filter(f => f.status === 'accepted');
    const pendingFriends = friends.filter(f => f.status === 'pending');

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Friends</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* Add friend section */}
            <View style={styles.addSection}>
                <Text style={styles.sectionLabel}>Add friend by phone</Text>
                <View style={styles.inputRow}>
                    <TextInput
                        style={styles.input}
                        placeholder="09XXXXXXXXX"
                        placeholderTextColor="#888"
                        keyboardType="phone-pad"
                        value={phone}
                        onChangeText={setPhone}
                        editable={!searching}
                    />
                    <TouchableOpacity
                        style={[styles.addButton, searching && styles.addButtonDisabled]}
                        onPress={sendFriendRequest}
                        disabled={searching}
                    >
                        {searching ? (
                            <ActivityIndicator color="#000" />
                        ) : (
                            <Ionicons name="person-add" size={24} color="#000" />
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* Friends list */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#FFD36A" />
                </View>
            ) : (
                <FlatList
                    data={[...pendingFriends, ...acceptedFriends]}
                    renderItem={renderFriendItem}
                    keyExtractor={item => item.connection_id}
                    contentContainerStyle={styles.listContent}
                    ListHeaderComponent={() => (
                        <View>
                            {pendingFriends.length > 0 && (
                                <Text style={styles.listSectionTitle}>
                                    Pending ({pendingFriends.length})
                                </Text>
                            )}
                        </View>
                    )}
                    ListEmptyComponent={() => (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="people-outline" size={64} color="#888" />
                            <Text style={styles.emptyText}>No friends yet</Text>
                            <Text style={styles.emptySubtext}>Add friends to see their locations on the map</Text>
                        </View>
                    )}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                />
            )}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 20,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFF',
    },
    addSection: {
        padding: 20,
        backgroundColor: '#111',
        borderBottomWidth: 1,
        borderBottomColor: '#222',
    },
    sectionLabel: {
        fontSize: 14,
        color: '#888',
        marginBottom: 12,
    },
    inputRow: {
        flexDirection: 'row',
        gap: 12,
    },
    input: {
        flex: 1,
        backgroundColor: '#222',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        color: '#FFF',
        fontSize: 16,
    },
    addButton: {
        width: 56,
        height: 56,
        borderRadius: 12,
        backgroundColor: '#FFD36A',
        justifyContent: 'center',
        alignItems: 'center',
    },
    addButtonDisabled: {
        opacity: 0.5,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        flexGrow: 1,
    },
    listSectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFD36A',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 12,
    },
    friendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#111',
    },
    friendAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#222',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    friendInfo: {
        flex: 1,
    },
    friendName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
        marginBottom: 4,
    },
    friendPhone: {
        fontSize: 14,
        color: '#888',
    },
    friendStatus: {
        fontSize: 12,
        color: '#FFD36A',
        marginTop: 4,
    },
    friendActions: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
    },
    acceptButton: {
        backgroundColor: '#4CAF50',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    acceptButtonText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
    removeButton: {
        padding: 8,
    },
    separator: {
        height: 1,
        backgroundColor: '#222',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 18,
        color: '#FFF',
        marginTop: 16,
        fontWeight: '600',
    },
    emptySubtext: {
        fontSize: 14,
        color: '#888',
        marginTop: 8,
        textAlign: 'center',
        paddingHorizontal: 40,
    },
});
