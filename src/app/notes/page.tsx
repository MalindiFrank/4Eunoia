'use client';

import type { FC } from 'react';
import React, { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format } from 'date-fns';
import { Edit, Plus, Trash2, GripVertical, FileText } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

// Define the Note interface (if not already defined elsewhere)
interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const noteSchema = z.object({
  title: z.string().min(1, 'Note title cannot be empty.'),
  content: z.string().min(1, 'Note content cannot be empty.'),
});

type NoteFormValues = z.infer<typeof noteSchema>;

// Mock function to get notes (replace with actual API call)
async function getNotes(): Promise<Note[]> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  // Retrieve notes from localStorage or return empty array
  const storedNotes = localStorage.getItem('prodev-notes');
  return storedNotes ? JSON.parse(storedNotes) : [];
}

// Mock function to save notes (replace with actual API call)
async function saveNotes(notes: Note[]): Promise<void> {
  localStorage.setItem('prodev-notes', JSON.stringify(notes));
}


const NotesPage: FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<NoteFormValues>({
    resolver: zodResolver(noteSchema),
    defaultValues: {
      title: '',
      content: '',
    },
  });

  useEffect(() => {
    const loadNotes = async () => {
      try {
        setIsLoading(true);
        const fetchedNotes = await getNotes();
        // Sort notes by updated date descending
        fetchedNotes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        setNotes(fetchedNotes);
      } catch (error) {
        console.error("Failed to fetch notes:", error);
        toast({
          title: "Error",
          description: "Could not load notes.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    loadNotes();
  }, [toast]);

  const openNoteDialog = (note: Note | null = null) => {
    setEditingNote(note);
    if (note) {
      form.reset({
        title: note.title,
        content: note.content,
      });
    } else {
      form.reset({
        title: '',
        content: '',
      });
    }
    setIsNoteDialogOpen(true);
  };

  const closeNoteDialog = () => {
    setIsNoteDialogOpen(false);
    setEditingNote(null);
    form.reset();
  };

  const onSubmit = async (data: NoteFormValues) => {
    let updatedNotes;
    const now = new Date();

    if (editingNote) {
      // Update existing note
      const updatedNote: Note = { ...editingNote, ...data, updatedAt: now };
      updatedNotes = notes.map((n) => (n.id === editingNote.id ? updatedNote : n));
      toast({ title: "Note Updated", description: `Note "${data.title}" has been updated.` });
       console.log('Updated Note:', updatedNote);
    } else {
      // Add new note
      const newNote: Note = {
        id: crypto.randomUUID(),
        ...data,
        createdAt: now,
        updatedAt: now,
      };
      updatedNotes = [newNote, ...notes];
      toast({ title: "Note Added", description: `Note "${data.title}" has been created.` });
      console.log('New Note:', newNote);
    }

    // Sort and save
    updatedNotes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    setNotes(updatedNotes);
    await saveNotes(updatedNotes); // Persist changes

    closeNoteDialog();
  };

  const deleteNote = async (noteId: string) => {
    const noteToDelete = notes.find(n => n.id === noteId);
    const remainingNotes = notes.filter((n) => n.id !== noteId);
    setNotes(remainingNotes);
    await saveNotes(remainingNotes); // Persist changes
    toast({ title: "Note Deleted", description: `Note "${noteToDelete?.title}" has been deleted.`, variant: "destructive" });
    console.log('Deleted Note ID:', noteId);
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
          <DialogContent className="sm:max-w-[600px]"> {/* Wider dialog for notes */}
            <DialogHeader>
              <DialogTitle>{editingNote ? 'Edit Note' : 'Create New Note'}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Note title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Start writing your note..." rows={10} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                    <DialogClose asChild>
                         <Button type="button" variant="outline">Cancel</Button>
                    </DialogClose>
                  <Button type="submit">{editingNote ? 'Update Note' : 'Create Note'}</Button>
                </DialogFooter>
              </form>
            </Form>
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
              <p className="text-center text-muted-foreground">Loading notes...</p>
            ) : notes.length === 0 ? (
              <p className="text-center text-muted-foreground">No notes yet. Create your first note!</p>
            ) : (
              <div className="space-y-3">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors group"
                  >
                     <div className="flex items-center gap-3 overflow-hidden">
                        <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-grow overflow-hidden">
                            <p className="text-sm font-medium truncate cursor-pointer" onClick={() => openNoteDialog(note)}>
                                {note.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Updated: {format(new Date(note.updatedAt), 'PP p')}
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
