"use client";

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Image from 'next/image';

interface RewardItem {
  id: string;
  name: string;
  description: string;
  xpCost: number;
  image: string;
}

export default function RewardsPage() {
  const [userXP, setUserXP] = useState(0);
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();
  
  const rewards: RewardItem[] = [
    {
      id: '1',
      name: 'Brawl Pass',
      description: 'Get a Brawl Pass for Brawl Stars',
      xpCost: 5000,
      image: '/images/rewards/brawl-pass.jpg'
    },
    {
      id: '2',
      name: 'Fortnite Battle Pass',
      description: 'Get a Battle Pass for Fortnite',
      xpCost: 5500,
      image: '/images/rewards/fortnite-pass.jpg'
    },
    {
      id: '3',
      name: 'Robux',
      description: '1000 Robux for Roblox',
      xpCost: 6000,
      image: '/images/rewards/robux.jpg'
    },
    {
      id: '4',
      name: 'AirPods Pro',
      description: 'Apple AirPods Pro',
      xpCost: 100000,
      image: '/images/rewards/airpods.jpg'
    },
    {
      id: '5',
      name: 'iPad Pro',
      description: 'Apple iPad Pro 11-inch',
      xpCost: 250000,
      image: '/images/rewards/ipad.jpg'
    }
  ];
  
  useEffect(() => {
    async function getUserXP() {
      try {
        setLoading(true);
        
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          console.error('Error fetching user:', userError);
          return;
        }
        
        // Get user XP from the database
        const { data, error } = await supabase
          .from('users')
          .select('xp_points')
          .eq('id', user.id)
          .single();
          
        if (error) {
          console.error('Error fetching XP:', error);
          return;
        }
        
        setUserXP(data?.xp_points || 0);
      } catch (error) {
        console.error('Error in getUserXP:', error);
      } finally {
        setLoading(false);
      }
    }
    
    getUserXP();
  }, [supabase]);
  
  const handleRedeemReward = (reward: RewardItem) => {
    if (userXP < reward.xpCost) {
      alert('Not enough XP to redeem this reward!');
      return;
    }
    
    alert(`This is a demo! In a real application, you would redeem ${reward.name} for ${reward.xpCost} XP.`);
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-4rem)]">
        <div className="w-16 h-16 border-4 border-t-blue-600 border-blue-200 rounded-full animate-spin"></div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Rewards</h1>
        <div className="bg-amber-100 py-2 px-4 rounded-full flex items-center">
          <span className="text-amber-800 font-medium">Your XP:</span>
          <span className="ml-2 text-amber-600 font-bold">{userXP.toLocaleString()}</span>
        </div>
      </div>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Redeem your XP for these awesome rewards!</h2>
        <p className="text-gray-600">
          Keep practicing and completing lessons to earn more XP. The more you learn, the more rewards you can get!
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rewards.map((reward) => (
          <div 
            key={reward.id} 
            className="bg-white rounded-lg overflow-hidden shadow-md border border-gray-200 transition-transform hover:scale-105"
          >
            <div className="h-48 bg-gray-200 relative flex items-center justify-center">
              {/* Fallback colored div in case images aren't available */}
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
                <span className="text-4xl">{reward.name[0]}</span>
              </div>
              {/* Uncomment when you have actual images */}
              {/* <Image 
                src={reward.image} 
                alt={reward.name}
                layout="fill"
                objectFit="cover"
              /> */}
            </div>
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-800">{reward.name}</h3>
              <p className="text-gray-600 mt-1">{reward.description}</p>
              <div className="mt-4 flex justify-between items-center">
                <span className="font-bold text-amber-600">{reward.xpCost.toLocaleString()} XP</span>
                <button 
                  onClick={() => handleRedeemReward(reward)}
                  disabled={userXP < reward.xpCost}
                  className={`px-4 py-2 rounded-full text-sm font-medium ${
                    userXP >= reward.xpCost
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {userXP >= reward.xpCost ? 'Redeem' : 'Not Enough XP'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 
