"use client";

import {
  BranchAssignmentField,
  useBranchAssignment,
} from "@/components/shared/branch-assignment";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  SermonSectionHeading,
  sermonWorkspaceClass,
} from "./sermon-presentation";
import {
  FileAudio,
  FileVideo,
  Tags,
  AlignLeft,
  Loader2,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { FreeTextCombobox } from "@/components/shared/free-text-combobox";
import { useSermonFormOptions } from "@/hooks/use-sermons";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ActionTooltip } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUploadMediaFile } from "@/hooks/use-media";
import { mediaPlaybackUrl } from "@/lib/media-playback";
import {
  sermonRecordingDraft,
  sermonRecordingError,
  type RecordingKind,
} from "@/lib/sermon-recording";
import { toast, getToastErrorMessage } from "@/lib/toast";
import { MediaUploadField } from "@/components/sermons/media-upload-field";
import type {
  Sermon,
  CreateSermonInput,
  UpdateSermonInput,
} from "@/hooks/use-sermons";

const sermonSchema = z.object({
  title: z.string().min(1, "Title is required"),
  speaker: z.string().optional(),
  sermonDate: z.string().min(1, "Date is required"),
  scriptureReference: z.string().optional(),
  seriesName: z.string().optional(),
  tags: z.array(z.string()).optional(),
  durationMinutes: z.string().optional(),
  durationSeconds: z.string().optional(),
  description: z.string().optional(),
});

type SermonFormValues = z.infer<typeof sermonSchema>;

interface SermonFormProps {
  sermon?: Sermon;
  onSubmit: (input: CreateSermonInput) => Promise<Sermon>;
  onSaveRecording?: (input: UpdateSermonInput) => Promise<Sermon>;
}

export function SermonForm({
  sermon,
  onSubmit,
  onSaveRecording,
}: SermonFormProps) {
  // Only a details save changes the branch baseline; media refetches must preserve drafts.
  const [savedDetails, setSavedDetails] = useState(sermon);
  const branchAssignment = useBranchAssignment(savedDetails);
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(sermon?.tags ?? []);
  const [audio, setAudio] = useState(() =>
    sermonRecordingDraft(sermon?.audioUrl),
  );
  const [video, setVideo] = useState(() =>
    sermonRecordingDraft(sermon?.videoUrl),
  );
  const [stage, setStage] = useState("details");
  const [recordingErrors, setRecordingErrors] = useState<
    Partial<Record<RecordingKind, string>>
  >({});
  const [savingMessage, setSavingMessage] = useState("");
  const saveLock = useRef(false);
  const initializedSermon = useRef<string | undefined>(undefined);
  const upload = useUploadMediaFile();
  const suggestions = useSermonFormOptions(!!sermon);

  const form = useForm<SermonFormValues>({
    resolver: zodResolver(sermonSchema),
    shouldFocusError: false,
    defaultValues: {
      title: "",
      speaker: "",
      sermonDate: "",
      scriptureReference: "",
      seriesName: "",
      tags: [],
      durationMinutes: "",
      durationSeconds: "",
      description: "",
    },
  });

  useEffect(() => {
    if (sermon && initializedSermon.current !== sermon.sermonId) {
      initializedSermon.current = sermon.sermonId;
      setSavedDetails(sermon);
      const dur = sermon.durationSeconds ?? 0;
      const mins = Math.floor(dur / 60);
      const secs = dur % 60;
      form.reset({
        title: sermon.title,
        speaker: sermon.speaker ?? "",
        sermonDate: sermon.sermonDate.slice(0, 10),
        scriptureReference: sermon.scriptureReference ?? "",
        seriesName: sermon.seriesName ?? "",
        tags: sermon.tags,
        durationMinutes: mins > 0 ? String(mins) : "",
        durationSeconds: secs > 0 ? String(secs) : "",
        description: sermon.description ?? "",
      });
      setTags(sermon.tags);
      setAudio(sermonRecordingDraft(sermon.audioUrl));
      setVideo(sermonRecordingDraft(sermon.videoUrl));
      setRecordingErrors({});
    }
  }, [sermon, form]);

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) {
      const next = [...tags, t];
      setTags(next);
      form.setValue("tags", next);
    }
    setTagInput("");
  };

  const removeTag = (t: string) => {
    const next = tags.filter((x) => x !== t);
    setTags(next);
    form.setValue("tags", next);
  };

  const nextStage = () => setStage(stage === "details" ? "audio" : "video");

  const saveRecording = async (kind: RecordingKind) => {
    if (saveLock.current || !sermon || !onSaveRecording) return;
    const draft = kind === "audio" ? audio : video;
    const validationError = sermonRecordingError(draft, kind);
    setRecordingErrors((previous) => ({
      ...previous,
      [kind]: validationError,
    }));
    if (validationError) return;
    saveLock.current = true;
    setSaving(true);
    try {
      let url = draft.url.trim();
      if (draft.file) {
        setSavingMessage(`Uploading ${kind}…`);
        const result = await upload.mutateAsync({
          file: draft.file,
          folder: "sermons",
          branchId: savedDetails?.branchId,
        });
        if (!result.url || !mediaPlaybackUrl(result.url))
          throw new Error(
            "The upload did not return a valid recording link. Please try again.",
          );
        url = result.url;
        // Reuse this upload when retrying a failed PATCH.
        const completed = { ...draft, file: null, url };
        if (kind === "audio") setAudio(completed);
        else setVideo(completed);
      }
      setSavingMessage(`Saving ${kind}…`);
      await onSaveRecording({
        [kind === "audio" ? "audioUrl" : "videoUrl"]: url || null,
      });
      toast.success(`${kind === "audio" ? "Audio" : "Video"} saved`);
    } catch (error) {
      const message = getToastErrorMessage(
        error,
        "Please try again. Your selection is still available.",
      );
      setRecordingErrors((previous) => ({ ...previous, [kind]: message }));
      toast.error(
        `${kind === "audio" ? "Audio" : "Video"} could not be saved`,
        { description: message },
      );
    } finally {
      saveLock.current = false;
      setSaving(false);
      setSavingMessage("");
    }
  };

  const handleSubmit = async (values: SermonFormValues) => {
    if (saveLock.current) return;
    const branchPayload = branchAssignment.payload();
    if (!branchPayload) {
      setStage("details");
      return;
    }
    saveLock.current = true;
    setSaving(true);
    setSavingMessage("Saving details…");
    try {
      const mins = parseInt(values.durationMinutes || "0", 10) || 0;
      const secs = parseInt(values.durationSeconds || "0", 10) || 0;
      const input: CreateSermonInput = {
        ...branchPayload,
        title: values.title,
        sermonDate: values.sermonDate,
        speaker: values.speaker || undefined,
        scriptureReference: values.scriptureReference || undefined,
        seriesName: values.seriesName || undefined,
        tags: tags.length > 0 ? tags : undefined,
        durationSeconds: mins * 60 + secs || undefined,
        description: values.description || undefined,
      };
      const saved = await onSubmit(input);
      setSavedDetails(saved);
      toast.success("Details saved");
    } catch (error) {
      const message = getToastErrorMessage(
        error,
        "Please try again. Your selections are still available.",
      );
      setStage("details");
      toast.error("Details could not be saved", { description: message });
    } finally {
      saveLock.current = false;
      setSaving(false);
      setSavingMessage("");
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={(event) => {
          if (stage === "details") void form.handleSubmit(handleSubmit)(event);
          else {
            event.preventDefault();
            void saveRecording(stage as RecordingKind);
          }
        }}
        data-sermon-editor
        className={`${sermonWorkspaceClass} space-y-4`}
        aria-busy={saving}
      >
        <fieldset disabled={saving} className="min-w-0 space-y-4">
          <Tabs value={stage} onValueChange={setStage}>
            <TabsList
              className="grid w-full grid-cols-3"
              aria-label="Sermon sections"
            >
              <TabsTrigger value="details" disabled={saving}>
                1. Details
              </TabsTrigger>
              <TabsTrigger value="audio" disabled={saving || !sermon}>
                2. Audio
              </TabsTrigger>
              <TabsTrigger value="video" disabled={saving || !sermon}>
                3. Video
              </TabsTrigger>
            </TabsList>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Save each section separately. Audio and video are optional.
              {!sermon && " Save details first to add recordings."}
            </p>
            <TabsContent value="details" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>
                    <SermonSectionHeading>Sermon Details</SermonSectionHeading>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <BranchAssignmentField assignment={branchAssignment} />
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. Walking in Faith"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="speaker"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Speaker</FormLabel>
                          <FormControl>
                            <FreeTextCombobox {...field} value={field.value ?? ""} label="Speakers" options={suggestions.data?.speakers ?? []} loading={suggestions.isLoading} failed={suggestions.isError} placeholder="Choose or type a speaker" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="sermonDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date *</FormLabel>
                          <FormControl>
                            <Input picker="wheel" type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="scriptureReference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Scripture Reference</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Hebrews 11:1-6" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>
                    <SermonSectionHeading icon={Tags}>
                      Series & Tags
                    </SermonSectionHeading>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="seriesName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Series</FormLabel>
                        <FormControl>
                          <FreeTextCombobox {...field} value={field.value ?? ""} label="Series" options={suggestions.data?.series ?? []} loading={suggestions.isLoading} failed={suggestions.isError} placeholder="Choose or type a series" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div>
                    <FormLabel>Tags</FormLabel>
                    <div className="mt-1.5 flex gap-2">
                      <Input
                        placeholder="Add a tag and press Enter"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addTag();
                          }
                        }}
                      />
                      <Button type="button" variant="outline" onClick={addTag}>
                        Add
                      </Button>
                    </div>
                    {tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {tags.map((t) => (
                          <span
                            key={t}
                            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                          >
                            {t}
                            <ActionTooltip label={`Remove ${t}`}>
                              <button
                                type="button"
                                onClick={() => removeTag(t)}
                                className="rounded-full p-0.5 hover:bg-primary/20"
                                aria-label={`Remove ${t}`}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </ActionTooltip>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>
                    <SermonSectionHeading icon={AlignLeft}>
                      Duration & Description
                    </SermonSectionHeading>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="durationMinutes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duration (minutes)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              placeholder="0"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="durationSeconds"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duration (seconds)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              max="59"
                              placeholder="0"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Sermon summary or notes..."
                            rows={4}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="audio">
              <Card>
                <CardHeader>
                  <CardTitle>
                    <SermonSectionHeading icon={FileAudio}>
                      Audio Recording
                    </SermonSectionHeading>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <MediaUploadField
                    label="Audio"
                    accept="audio/*"
                    mediaType="audio"
                    value={audio}
                    onChange={(draft) => {
                      setAudio(draft);
                      setRecordingErrors((previous) => ({
                        ...previous,
                        audio: undefined,
                      }));
                    }}
                    disabled={saving}
                    error={recordingErrors.audio}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="video">
              <Card>
                <CardHeader>
                  <CardTitle>
                    <SermonSectionHeading icon={FileVideo}>
                      Video Recording
                    </SermonSectionHeading>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <MediaUploadField
                    label="Video"
                    accept="video/*"
                    mediaType="video"
                    value={video}
                    onChange={(draft) => {
                      setVideo(draft);
                      setRecordingErrors((previous) => ({
                        ...previous,
                        video: undefined,
                      }));
                    }}
                    disabled={saving}
                    error={recordingErrors.video}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              {stage !== "details" && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setStage(stage === "video" ? "audio" : "details")
                  }
                >
                  Back
                </Button>
              )}
              {sermon && stage !== "video" && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void nextStage()}
                >
                  Next
                </Button>
              )}
            </div>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saving
                ? "Saving…"
                : stage === "details"
                  ? "Save Details"
                  : stage === "audio"
                    ? "Save Audio"
                    : "Save Video"}
            </Button>
          </div>
        </fieldset>
        {savingMessage && (
          <p role="status" className="text-sm text-muted-foreground">
            {savingMessage}
          </p>
        )}
      </form>
    </Form>
  );
}
