import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import HomeScreen from '../screens/HomeScreen';
import BalanceScreen from '../screens/BalanceScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MyQRScreen from '../screens/MyQRScreen';
import BottomNav from '../components/BottomNav';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
    return (
        <Tab.Navigator
            tabBar={(props) => <BottomNav {...props} />}
            screenOptions={{
                headerShown: false,
            }}
            initialRouteName="Home"
        >
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="Balance" component={BalanceScreen} />
            <Tab.Screen name="Transactions" component={TransactionsScreen} />
            <Tab.Screen name="Profile" component={ProfileScreen} />
            <Tab.Screen name="MyQR" component={MyQRScreen} />
        </Tab.Navigator>
    );
}
