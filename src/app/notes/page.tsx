'use client';

import type { FC } from 'react';
import React, { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format, parseISO } from 'date-fns'; // Removed subDays
import { Edit, Plus, Trash2, FileText } from 'lucide-react'; // Removed GripVertical

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
// import { Separator } from '@/components/ui/separator'; // Separator removed from list view
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useDataMode } from '@/context/data-mode-context'; // Import useDataMode
import { getNotes, addUserNote, updateUserNote, deleteUserNote, type Note } from '@/services/note'; // Import from new service file
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

// Define the Note interface (if not already defined elsewhere) - Now imported from service

const noteSchema = z.object({
  title: z.string().min(1, 'Note title cannot be empty.'),
  content: z.string().min(1, 'Note content cannot be empty.'),
});

type NoteFormValues = z.infer<typeof noteSchema>;


// Note Form Component
const NoteForm: FC<{
    onClose: () => void;
    initialData?: Note | null;
    onSave: (note: Note) => void;
}> = ({ onClose, initialData, onSave }) => {
     const { dataMode } = useDataMode();
     const { toast } = useToast();

     const form = useForm<NoteFormValues>({
        resolver: zodResolver(noteSchema),
        defaultValues: initialData ? {
            title: initialData.title,
            content: initialData.content,
        } : {
            title: '',
            content: '',
        },
     });

    const onSubmit = (data: NoteFormValues) => {
        if (dataMode === 'mock') {
            toast({ title: "Read-only Mode", description: "Cannot add or edit notes in mock data mode.", variant: "destructive"});
            onClose();
            return;
        }

        const noteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt'> = data;

        try {
            let savedNote: Note | undefined;
            if (initialData?.id) {
                savedNote = updateUserNote({ ...noteData, id: initialData.id });
                 if (savedNote) {
                    toast({ title: "Note Updated", description: `Note "${data.title}" updated.` });
                 } else {
                    throw new Error("Failed to find note to update.");
                 }
            } else {
                savedNote = addUserNote(noteData);
                toast({ title: "Note Added", description: `Note "${data.title}" created.` });
            }
             if (savedNote) {
                onSave(savedNote);
            }
        } catch (error) {
             console.error("Error saving note:", error);
             toast({ title: "Error", description: "Could not save note.", variant: "destructive"});
        } finally {
             onClose();
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField control={form.control} name="title" render={({ field }) => ( <FormItem> <FormLabel>Title</FormLabel> <FormControl> <Input placeholder="Note title" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                <FormField control={form.control} name="content" render={({ field }) => ( <FormItem> <FormLabel>Content</FormLabel> <FormControl> <Textarea placeholder="Start writing your note..." rows={10} {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                    <Button type="submit" disabled={dataMode === 'mock'}>{initialData ? 'Update Note' : 'Create Note'}</Button>
                </DialogFooter>
            </form>
        </Form>
    );
};


const NotesPage: FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Use loading state
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const { toast } = useToast();
  const { dataMode } = useDataMode(); // Use data mode context

  // Load notes based on dataMode
  useEffect(() => {
    const loadNotes = async () => {
        setIsLoading(true);
        try {
            const loadedNotes = await getNotes(dataMode);
            setNotes(loadedNotes);
        } catch (error) {
             console.error("Failed to load notes:", error);
             toast({ title: "Error", description: "Could not load notes.", variant: "destructive"});
             setNotes([]); // Clear on error
        } finally {
            setIsLoading(false);
        }
    };
    loadNotes();
  }, [dataMode, toast]);

  const openNoteDialog = (note: Note | null = null) => {
    setEditingNote(note);
    setIsNoteDialogOpen(true);
  };

  const closeNoteDialog = () => {
    setIsNoteDialogOpen(false);
    setEditingNote(null);
  };

   const handleSaveNote = (savedNote: Note) => {
        setNotes(prev => {
            const existing = prev.find(n => n.id === savedNote.id);
            let updated: Note[];
            if (existing) {
                updated = prev.map(n => n.id === savedNote.id ? savedNote : n);
            } else {
                updated = [savedNote, ...prev];
            }
            return updated.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        });
        closeNoteDialog();
   };

   const deleteNote = (noteId: string) => {
        if (dataMode === 'mock') {
            toast({ title: "Read-only Mode", description: "Cannot delete notes in mock data mode.", variant: "destructive"});
            return;
        }
       const noteToDelete = notes.find(n => n.id === noteId);
       try {
            const success = deleteUserNote(noteId);
            if (success) {
                setNotes(prev => prev.filter(n => n.id !== noteId));
                toast({ title: "Note Deleted", description: `Note "${noteToDelete?.title}" deleted.`, variant: "default" });
            } else {
                 throw new Error("Failed to find note to delete.");
            }
       } catch (error) {
            console.error("Error deleting note:", error);
            toast({ title: "Error", description: "Could not delete note.", variant: "destructive"});
       }
   };


  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Notes</h1>
        <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openNoteDialog()}>
              <Plus className="mr-2 h-4 w-4" /> New Note
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{editingNote ? 'Edit Note' : 'Create New Note'}</DialogTitle>
            </DialogHeader>
             <NoteForm
                 onClose={closeNoteDialog}
                 initialData={editingNote}
                 onSave={handleSaveNote}
             />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Your Notes</CardTitle>
          <CardDescription>Manage and organize your notes.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] w-full">
            {isLoading ? (
                 <div className="space-y-3">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                 </div>
            ) : notes.length === 0 ? (
              <p className="text-center text-muted-foreground pt-10">
                 {dataMode === 'mock' ? 'No mock notes loaded.' : 'No notes yet. Create your first note!'}
              </p>
            ) : (
              <div className="space-y-3">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors group"
                  >
                     <div className="flex items-center gap-3 overflow-hidden flex-grow cursor-pointer" onClick={() => openNoteDialog(note)}>
                        <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-grow overflow-hidden">
                            <p className="text-sm font-medium truncate">
                                {note.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Updated: {format(note.updatedAt, 'PP p')}
                            </p>
                        </div>
                     </div>
                    <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openNoteDialog(note)}>
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit Note</span>
                      </Button>

                        <AlertDialog>
                             <AlertDialogTrigger asChild>
                                 <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                                   <Trash2 className="h-4 w-4" />
                                   <span className="sr-only">Delete Note</span>
                                 </Button>
                             </AlertDialogTrigger>
                             <AlertDialogContent>
                               <AlertDialogHeader>
                                 <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                 <AlertDialogDescription>
                                   This action cannot be undone. This will permanently delete the note titled "{note.title}".
                                 </AlertDialogDescription>
                               </AlertDialogHeader>
                               <AlertDialogFooter>
                                 <AlertDialogCancel>Cancel</AlertDialogCancel>
                                 <AlertDialogAction onClick={() => deleteNote(note.id)} className={cn("bg-destructive text-destructive-foreground hover:bg-destructive/90")}>
                                   Delete
                                 </AlertDialogAction>
                               </AlertDialogFooter>
                             </AlertDialogContent>
                           </AlertDialog>

                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotesPage;
