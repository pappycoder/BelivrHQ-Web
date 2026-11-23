import type { EmailContact } from "@/hooks/use-email";
export interface EmailDraft { recipients:EmailContact[];subject:string;body:string; }
export const EMPTY_EMAIL_DRAFT:EmailDraft={recipients:[],subject:"",body:""};
export function parseEmailDraft(raw:unknown):EmailDraft {
 if(!raw||typeof raw!=="object")return EMPTY_EMAIL_DRAFT;
 const item=raw as Record<string,unknown>;
 return {subject:typeof item.subject==="string"?item.subject.slice(0,500):"",body:typeof item.body==="string"?item.body.slice(0,100000):"",recipients:Array.isArray(item.recipients)?item.recipients.filter((contact):contact is EmailContact=>!!contact&&typeof contact==="object"&&typeof contact.id==="string"&&typeof contact.name==="string"&&typeof contact.role==="string").slice(0,200):[]};
}
