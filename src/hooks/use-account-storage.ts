"use client";
import { useCallback, useEffect, useRef, useState, type SetStateAction } from "react";
import { useCurrentProfile } from "@/hooks/use-profile";
export function accountStorageKey(namespace:string,churchId:string,profileId:string) { return `belivr:personal:${namespace}:${churchId}:${profileId}`; }
/** Private, browser-local preferences. Never write one account's state under another account's key. */
export function useAccountStorage<T>(namespace:string, initial:T, parse:(raw:unknown)=>T) {
  const {data:profile}=useCurrentProfile();
  const key=profile?.churchId&&profile?.profileId ? accountStorageKey(namespace,profile.churchId,profile.profileId) : "";
  const defaults=useRef({initial,parse});
  const [record,setRecord]=useState<{key:string;value:T}>({key:"",value:initial});
  const latest=useRef(record);latest.current=record;
  const [error,setError]=useState(false);
  useEffect(()=>{
    let value=defaults.current.initial;let failed=false;
    if(key)try{const saved=localStorage.getItem(key);if(saved)value=defaults.current.parse(JSON.parse(saved));}catch{failed=true;}
    const next={key,value};latest.current=next;setRecord(next);setError(failed);
  },[key]);
  const setValue=useCallback((action:SetStateAction<T>)=>{
    if(!key||latest.current.key!==key)return;
    const value=typeof action==="function" ? (action as (current:T)=>T)(latest.current.value) : action;
    const next={key,value};latest.current=next;setRecord(next);
    try{localStorage.setItem(key,JSON.stringify(value));setError(false);}catch{setError(true);}
  },[key]);
  const clear=useCallback(()=>{
    if(!key||latest.current.key!==key)return;
    const next={key,value:defaults.current.initial};latest.current=next;setRecord(next);
    try{localStorage.removeItem(key);setError(false);}catch{setError(true);}
  },[key]);
  return {value:record.key===key?record.value:defaults.current.initial,setValue,clear,ready:!!key&&record.key===key,error};
}
