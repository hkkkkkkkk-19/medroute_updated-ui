
import { Medicine, User, UserRole } from '../types.ts';
import { db, handleFirestoreError, OperationType } from '../firebase.ts';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  serverTimestamp, 
  setDoc, 
  doc, 
  updateDoc, 
  onSnapshot,
  orderBy
} from 'firebase/firestore';

export const backendService = {
  // User Management
  register: async (userData: any) => {
    try {
      const userRef = doc(db, 'users', userData.uid);
      await setDoc(userRef, {
        ...userData,
        createdAt: serverTimestamp()
      });
      return userData;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'users');
    }
  },

  // Donation Management
  addDonation: async (donation: any, userId: string) => {
    try {
      const otp = Math.floor(1000 + Math.random() * 9000).toString();
      const receiptNumber = 'MR-' + Math.random().toString(36).substr(2, 6).toUpperCase();
      
      const medName = (donation.name || '').toLowerCase();
      
      const scenarios = [
        {
          tags: ['pain', 'combiflam', 'relief'],
          impact: `Your donated ${donation.quantity || 1} unit of ${donation.name || 'medicine'} travelled 42 km to Baramulla, helping provide pain relief to a construction worker with a verified prescription. Your contribution prevented medicine waste and supported timely treatment.`,
          message: "Thank you for donating this medicine. It really helped me when I needed it."
        },
        {
          tags: ['fever', 'cold', 'flu'],
          impact: `Your medicine travelled 27 km to Budgam and was delivered to a school student recovering from fever. Your donation ensured the medicine was used before expiry.`,
          message: "Thank you for helping me get the medicine I needed."
        },
        {
          tags: ['pain', 'body', 'ache'],
          impact: `Your donated medicine travelled 63 km to Anantnag, supporting treatment for a local shopkeeper experiencing severe body pain.`,
          message: "I’m very grateful for your kindness. Thank you for helping someone you don’t even know."
        }
      ];

      let matchingScenarios = scenarios.filter(s => 
        s.tags.some(tag => medName.includes(tag))
      );

      if (matchingScenarios.length === 0) {
        matchingScenarios = scenarios;
      }

      const randomScenario = matchingScenarios[Math.floor(Math.random() * matchingScenarios.length)];
      
      const newDonation = {
        ...donation,
        donorId: userId,
        status: 'VERIFIED',
        quantity: Number(donation.quantity || 1),
        otp,
        receiptNumber,
        impactMessage: randomScenario.impact,
        thankYouMessage: randomScenario.message,
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'deliveries'), newDonation);
      return { ...newDonation, id: docRef.id };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'deliveries');
    }
  },

  // Receiver Management
  addRequest: async (requestData: any, userId: string) => {
    try {
      const newRequest = {
        ...requestData,
        receiverId: userId,
        createdAt: serverTimestamp(),
        status: requestData.status || 'Prescription Uploaded',
        otp: Math.floor(1000 + Math.random() * 9000).toString()
      };
      const docRef = await addDoc(collection(db, 'requests'), newRequest);
      return { ...newRequest, id: docRef.id };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'requests');
    }
  },

  updateRequestStatus: async (requestId: string, status: string, additionalData: any = {}) => {
    try {
      const docRef = doc(db, 'requests', requestId);
      await updateDoc(docRef, { 
        status, 
        ...additionalData,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `requests/${requestId}`);
    }
  }
};
