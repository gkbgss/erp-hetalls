import React, { createContext, useContext, useState, useMemo } from 'react';

const initialMessages = [
  {
    id: 'm1',
    sender: 'Sarah Jenkins',
    role: 'Sales Representative',
    department: 'Sales',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    subject: 'Question regarding Q3 commission payout',
    content: 'Hi Team,\n\nI was reviewing my paystub for the last cycle and I noticed the Q3 commission bonus seems to be missing. Could you please check if it was processed? \n\nThanks,\nSarah',
    date: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
    isRead: false
  },
  {
    id: 'm2',
    sender: 'David Chen',
    role: 'Warehouse Manager',
    department: 'Operations',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
    subject: 'Need approval for new forklift lease',
    content: 'Hello Finance,\n\nOur current forklift lease is expiring next month. I have attached the quotes for the renewal vs a new lease from a different vendor. The new lease saves us about 15% annually. Can we get this approved by Friday?\n\nBest,\nDavid',
    date: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    isRead: false
  },
  {
    id: 'm3',
    sender: 'Elena Rodriguez',
    role: 'Marketing Specialist',
    department: 'Marketing',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Elena',
    subject: 'Reimbursement for Ads Summit 2026',
    content: 'Hi HR/Finance,\n\nI have submitted my expense report for the Ads Summit last week through the portal, but I wanted to make sure you received the hotel receipts since the file size was quite large. Please let me know if you need me to resend them.\n\nThanks,\nElena',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    isRead: true
  },
  {
    id: 'm4',
    sender: 'Michael Chang',
    role: 'Senior Developer',
    department: 'IT',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael',
    subject: 'Request for hardware upgrade',
    content: 'Hi,\n\nMy current workstation is struggling with the new Docker containers we are running for the ERP system. Is there any budget available for a RAM upgrade this quarter?\n\nRegards,\nMichael',
    date: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
    isRead: false
  }
];

const MessagesContext = createContext();

export function MessagesProvider({ children }) {
  const [messages, setMessages] = useState(initialMessages);

  const unreadCount = useMemo(() => {
    return messages.filter(m => !m.isRead).length;
  }, [messages]);

  const markAsRead = (id) => {
    setMessages(prev => 
      prev.map(m => m.id === id ? { ...m, isRead: true } : m)
    );
  };

  const deleteMessage = (id) => {
    setMessages(prev => prev.filter(m => m.id !== id));
  };

  return (
    <MessagesContext.Provider value={{ messages, unreadCount, markAsRead, deleteMessage }}>
      {children}
    </MessagesContext.Provider>
  );
}

export function useMessages() {
  const context = useContext(MessagesContext);
  if (!context) {
    throw new Error('useMessages must be used within a MessagesProvider');
  }
  return context;
}
