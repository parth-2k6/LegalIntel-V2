
'use server';

import { classifyDocument, type ClassifyDocumentOutput } from '@/ai/flows/classify-uploaded-document';
import { askDocumentQuestion, type AskDocumentQuestionOutput } from '@/ai/flows/ask-document-question';
import { generateSpeech, type GenerateSpeechOutput } from '@/ai/flows/generate-speech';
import { startRolePlay, type StartRolePlayInput, type StartRolePlayOutput } from '@/ai/flows/start-role-play';
import { continueRolePlay, type ContinueRolePlayInput, type ContinueRolePlayOutput } from '@/ai/flows/continue-role-play';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { db, auth, storage } from '@/lib/firebase-admin';


// Helper to update task status in Firestore
const updateTask = async (userId: string, taskId: string, data: any) => {
    const taskRef = db.collection('users').doc(userId).collection('tasks').doc(taskId);
    await taskRef.update(data);
};


export async function createTask(userId: string, taskData: { type: string, payload: any }): Promise<{ taskId: string } | { error: string }> {
    if (!userId || !taskData) {
        return { error: 'User ID and task data are required.' };
    }
    try {
        const taskRef = await db.collection('users').doc(userId).collection('tasks').add({
            ...taskData,
            status: 'pending',
            createdAt: FieldValue.serverTimestamp(),
        });

        // This is where a background worker would normally take over.
        // For this environment, we'll process it immediately but the client won't wait.
        if (taskData.type === 'classifyDocument') {
            processClassifyDocumentTask(userId, taskRef.id, taskData.payload);
        } else if (taskData.type === 'askQuestion') {
            processAskQuestionTask(userId, taskRef.id, taskData.payload);
        }

        return { taskId: taskRef.id };
    } catch (error: any) {
        console.error('Error creating task:', error);
        return { error: 'Failed to create the task. ' + error.message };
    }
}


async function processClassifyDocumentTask(userId: string, taskId: string, payload: any) {
    try {
        await updateTask(userId, taskId, { status: 'processing' });
        const result = await classifyDocument(payload);

        if ('error' in result) {
            throw new Error(result.error);
        }
        
        let recommendedLawyers: any[] = [];
        let estimatedCostRange = 'N/A';

        if (result.lawyerCategory) {
            const lawyersSnapshot = await db.collection('lawyers')
                .where('specialty', '==', result.lawyerCategory)
                .limit(3)
                .get();

            if (!lawyersSnapshot.empty) {
                recommendedLawyers = lawyersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // Calculate estimated cost range
                if (result.expenditureAnalysis.estimatedHearings > 0 && recommendedLawyers.length > 0) {
                    const costs = recommendedLawyers
                        .map(l => l.costPerHearing * result.expenditureAnalysis.estimatedHearings)
                        .filter(c => c > 0);
                    
                    if (costs.length > 0) {
                        const minCost = Math.min(...costs);
                        const maxCost = Math.max(...costs);
                        estimatedCostRange = `₹${minCost.toLocaleString()} - ₹${maxCost.toLocaleString()}`;
                    }
                }
            }
        }
        
        const finalResult = { 
            ...result, 
            recommendedLawyers,
            expenditureAnalysis: {
                ...result.expenditureAnalysis,
                estimatedCostRange: estimatedCostRange,
            }
        };

        // Save to history
        try {
            await db.collection('users').doc(userId).collection('history').add({
                ...finalResult,
                fileName: payload.fileName,
                fileAsBase64: payload.fileAsBase64,
                mimeType: payload.mimeType,
                createdAt: FieldValue.serverTimestamp(),
            });
        } catch (dbError) {
            console.error('Firestore history write error:', dbError);
            // Don't fail the whole task if history write fails
        }
        
        await updateTask(userId, taskId, { status: 'completed', result: finalResult });

    } catch (e: any) {
        console.error(`Error processing classify task ${taskId}:`, e);
        await updateTask(userId, taskId, { status: 'failed', error: e.message });
    }
}

async function processAskQuestionTask(userId: string, taskId: string, payload: any) {
    try {
        await updateTask(userId, taskId, { status: 'processing' });
        const result = await askDocumentQuestion(payload);

        if ('error' in result) {
            throw new Error(result.error);
        }
        
        await updateTask(userId, taskId, { status: 'completed', result });
    } catch (e: any) {
        console.error(`Error processing question task ${taskId}:`, e);
        await updateTask(userId, taskId, { status: 'failed', error: e.message });
    }
}


export async function getSpeech(text: string): Promise<GenerateSpeechOutput | { error: string }> {
  try {
    const result = await generateSpeech(text);
    return result;
  } catch (error: any) {
    console.error('Error generating speech:', error);
    return { error: 'Failed to generate speech.' };
  }
}

export async function startNewRolePlay(input: StartRolePlayInput & { userId: string }): Promise<(StartRolePlayOutput & { sessionId: string }) | { error: string }> {
  if (!input.scenario || !input.role || !input.userId) {
    return { error: 'Role, scenario, and user ID are required.' };
  }
  try {
    const result = await startRolePlay(input);
    if ('error' in result) {
      return result;
    }
    
    const sessionRef = await db.collection('users').doc(input.userId).collection('rolePlaySessions').add({
      ...input,
      ...result,
      createdAt: FieldValue.serverTimestamp(),
    });

    return { ...result, sessionId: sessionRef.id };

  } catch (error: any) {
    console.error('Error starting role play:', error);
    return { error: 'Failed to start role-play session. ' + error.message };
  }
}

export async function deleteRolePlaySession(userId: string, sessionId: string): Promise<{ success: boolean } | { error: string }> {
    if (!userId || !sessionId) {
        return { error: 'User ID and Session ID are required.' };
    }
    try {
        await db.collection('users').doc(userId).collection('rolePlaySessions').doc(sessionId).delete();
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting role play session:', error);
        return { error: 'Failed to delete session. ' + error.message };
    }
}

export async function continueExistingRolePlay(input: ContinueRolePlayInput): Promise<ContinueRolePlayOutput | { error:string }> {
  if (!input.messages || input.messages.length === 0) {
    return { error: 'Conversation history is required.' };
  }
  try {
    const result = await continueRolePlay(input);
    return result;
  } catch (error: any) {
    console.error('Error continuing role play:', error);
    return { error: 'Failed to get a response. ' + error.message };
  }
}


const profileFormSchema = z.object({
  displayName: z.string().min(1, "Display name is required.").optional(),
  about: z.string().optional(),
  photoBase64: z.string().optional(),
  photoMimeType: z.string().optional(),
});

export async function updateUserProfile(userId: string, data: z.infer<typeof profileFormSchema>): Promise<{ success: boolean } | { error: string }> {
    if (!userId) {
        return { error: 'User not authenticated.' };
    }

    const validation = profileFormSchema.safeParse(data);
    if (!validation.success) {
        return { error: validation.error.flatten().fieldErrors.toString() };
    }

    const { displayName, about, photoBase64, photoMimeType } = validation.data;
    const userRef = db.collection('users').doc(userId);
    let photoURL: string | undefined = undefined;

    try {
        // Upload photo to storage if provided
        if (photoBase64 && photoMimeType) {
            const bucket = storage.bucket();
            const fileName = `profile-pictures/${userId}/${Date.now()}`;
            const file = bucket.file(fileName);
            const buffer = Buffer.from(photoBase64, 'base64');

            await file.save(buffer, {
                metadata: { contentType: photoMimeType },
            });
            photoURL = (await file.getSignedUrl({ action: 'read', expires: '03-09-2491' }))[0];
        }

        // Prepare data for update
        const authUpdateData: { displayName?: string, photoURL?: string } = {};
        const firestoreUpdateData: { displayName?: string, photoURL?: string, about?: string, updatedAt: FieldValue } = { updatedAt: FieldValue.serverTimestamp() };

        if (displayName) {
            authUpdateData.displayName = displayName;
            firestoreUpdateData.displayName = displayName;
        }
        if (photoURL) {
            authUpdateData.photoURL = photoURL;
            firestoreUpdateData.photoURL = photoURL;
        }
        if (about) {
            firestoreUpdateData.about = about;
        }

        // Update Firebase Auth
        if (Object.keys(authUpdateData).length > 0) {
            await auth.updateUser(userId, authUpdateData);
        }

        // Update Firestore
        await userRef.set(firestoreUpdateData, { merge: true });

        return { success: true };
    } catch (e: any) {
        console.error("Error updating user profile:", e);
        return { error: e.message };
    }
}

// Admin Actions
export async function createNewUser(data: { email: string, password?: string, displayName: string, role: 'user' | 'lawyer' | 'admin' }): Promise<{ uid: string } | { error: string }> {
    try {
        const userRecord = await auth.createUser({
            email: data.email,
            password: data.password,
            displayName: data.displayName,
            emailVerified: true,
        });

        await db.collection('users').doc(userRecord.uid).set({
            email: data.email,
            displayName: data.displayName,
            role: data.role,
            createdAt: FieldValue.serverTimestamp(),
            photoURL: null,
        });

        return { uid: userRecord.uid };
    } catch (e: any) {
        console.error("Error creating new user:", e);
        return { error: e.message };
    }
}

export async function addLawyer(lawyer: { name: string, email: string, password?: string, specialty: string, location: string, contact: string, costPerHearing: number }): Promise<{ id: string } | { error: string }> {
    try {
        // Create the user in Firebase Auth
        const userRecord = await auth.createUser({
            email: lawyer.email,
            password: lawyer.password,
            displayName: lawyer.name,
            emailVerified: true,
        });

        // Create the user profile in the 'users' collection with 'lawyer' role
        await db.collection('users').doc(userRecord.uid).set({
            email: lawyer.email,
            displayName: lawyer.name,
            role: 'lawyer',
            createdAt: FieldValue.serverTimestamp(),
            photoURL: null,
        });

        // Create the lawyer profile in the 'lawyers' collection
        const docRef = await db.collection('lawyers').add({
            name: lawyer.name,
            specialty: lawyer.specialty,
            location: lawyer.location,
            contact: lawyer.contact,
            costPerHearing: lawyer.costPerHearing,
            uid: userRecord.uid, // Link to the auth user
            createdAt: FieldValue.serverTimestamp()
        });
        return { id: docRef.id };
    } catch (e: any) {
        return { error: e.message };
    }
}

export async function deleteLawyer(id: string): Promise<{ success: boolean } | { error: string }> {
    try {
        const lawyerDoc = await db.collection('lawyers').doc(id).get();
        if (!lawyerDoc.exists) {
            throw new Error('Lawyer not found');
        }
        const lawyerData = lawyerDoc.data();
        
        if (lawyerData?.uid) {
            // Delete from auth
            await auth.deleteUser(lawyerData.uid);
            // Delete user document
            await db.collection('users').doc(lawyerData.uid).delete();
        }

        // Delete lawyer profile
        await db.collection('lawyers').doc(id).delete();

        return { success: true };
    } catch (e: any) {
        console.error("Error deleting lawyer:", e);
        return { error: e.message };
    }
}

const lawyerProfileSchema = z.object({
  name: z.string(),
  specialty: z.string().min(1, "Specialty is required."),
  location: z.string().min(1, "Location is required."),
  contact: z.string().min(1, "Contact info is required."),
  costPerHearing: z.coerce.number().min(0, "Cost must be a positive number."),
});

export async function updateLawyerProfile(userId: string, data: z.infer<typeof lawyerProfileSchema>): Promise<{ success: boolean } | { error: string }> {
    if (!userId) {
        return { error: 'User not authenticated.' };
    }

    const validation = lawyerProfileSchema.safeParse(data);
    if (!validation.success) {
        return { error: validation.error.flatten().fieldErrors.toString() };
    }

    try {
        const lawyerQuery = db.collection('lawyers').where('uid', '==', userId);
        const querySnapshot = await lawyerQuery.get();

        if (querySnapshot.empty) {
            // No profile exists, create one. The doc ID will be the UID.
            await db.collection('lawyers').doc(userId).set({
                ...validation.data,
                uid: userId,
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp()
            });
        } else {
             // Profile exists, update it.
            const docId = querySnapshot.docs[0].id;
            await db.collection('lawyers').doc(docId).update({
                ...validation.data,
                updatedAt: FieldValue.serverTimestamp()
            });
        }
        
        // Also update the display name in the main user record
        await db.collection('users').doc(userId).update({
            displayName: validation.data.name
        });
        await auth.updateUser(userId, { displayName: validation.data.name });


        return { success: true };
    } catch (e: any) {
        console.error("Error updating lawyer profile:", e);
        return { error: e.message };
    }
}


// Lawyer Case Log Actions
const caseLogSchema = z.object({
    caseName: z.string().min(1, "Case name is required."),
    clientName: z.string().min(1, "Client name is required."),
    caseNumber: z.string().optional(),
});

export async function createCaseLog(userId: string, data: z.infer<typeof caseLogSchema>): Promise<{ caseId: string } | { error: string }> {
    if (!userId) {
        return { error: 'User not authenticated.' };
    }

    const validation = caseLogSchema.safeParse(data);
    if (!validation.success) {
        return { error: validation.error.flatten().fieldErrors.toString() };
    }

    try {
        const caseRef = await db.collection('users').doc(userId).collection('caseLogs').add({
            ...validation.data,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });
        return { caseId: caseRef.id };
    } catch (e: any) {
        return { error: e.message };
    }
}

export async function addCaseLogEntry(userId: string, caseId: string, entry: string): Promise<{ success: true } | { error: string }> {
    if (!userId || !caseId || !entry) {
        return { error: 'User ID, Case ID, and entry text are required.' };
    }
    
    try {
        const caseRef = db.collection('users').doc(userId).collection('caseLogs').doc(caseId);
        await caseRef.collection('entries').add({
            entry,
            createdAt: FieldValue.serverTimestamp(),
        });
        await caseRef.update({ updatedAt: FieldValue.serverTimestamp() });
        return { success: true };
    } catch (e: any) {
        return { error: e.message };
    }
}
