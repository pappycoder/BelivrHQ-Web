import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { NextRequest, NextResponse } from 'next/server';
import { expireSession, readSession, saveSession, trustedBrowserRequest } from '../server-session';
import { migratePreferences, SUBSCRIPTION_REFERENCE } from './identity';

const request = (cookie: string, headers: Record<string,string> = {}) => new NextRequest('https://example.test/api/session', {headers:{cookie,...headers}});
describe('rebrand compatibility', () => {
 it('restores the complete legacy session and prefers the new family without mixing tokens', () => {
  expect(readSession(request('churchos_token=old; churchos_refresh_token=old-refresh'))).toEqual({access:'old',refresh:'old-refresh'});
  expect(readSession(request('belivrhq_token=new; churchos_refresh_token=old-refresh'))).toEqual({access:'new',refresh:undefined});
  expect(readSession(request('belivrhq_token=; churchos_token=old; churchos_refresh_token=old-refresh'))).toEqual({access:'',refresh:undefined});
 });
 it('keeps legacy clients same-origin protected and never falls back from an invalid new header', () => {
  expect(trustedBrowserRequest(request('', {'x-churchos-client':'web'}))).toBe(true);
  expect(trustedBrowserRequest(request('', {'x-churchos-client':'web','x-belivrhq-client':'invalid'}))).toBe(false);
  expect(trustedBrowserRequest(request('', {'x-churchos-client':'web',origin:'https://foreign.test'}))).toBe(false);
 });
 it('writes compatible sessions and expires both cookie families', () => {
  const response = NextResponse.json({});
  saveSession(response,{accessToken:'token',refreshToken:'refresh'});
  expect(response.cookies.getAll()).toHaveLength(4);
  expireSession(response);
  expect(response.cookies.getAll().every(cookie => cookie.maxAge === 0)).toBe(true);
 });
 it('migrates preferences without replacing newer choices or deleting old keys', () => {
  const values = new Map([['churchos:theme','dark'],['belivrhq:theme','light'],['churchos-table','compact']]);
  const storage = {get length(){return values.size},key:(i:number)=>Array.from(values.keys())[i]??null,getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value)}} as Storage;
  migratePreferences(storage); migratePreferences(storage);
  expect(values.get('belivrhq:theme')).toBe('light');
  expect(values.get('belivrhq-table')).toBe('compact');
  expect(values.get('churchos-table')).toBe('compact');
 });
 it('accepts pending references from either generation', () => {
  expect(SUBSCRIPTION_REFERENCE.test('COSUB_'+'a'.repeat(32))).toBe(true);
  expect(SUBSCRIPTION_REFERENCE.test('BHQSUB_'+'b'.repeat(32))).toBe(true);
  expect(SUBSCRIPTION_REFERENCE.test('BHQSUB_bad')).toBe(false);
 });
});
