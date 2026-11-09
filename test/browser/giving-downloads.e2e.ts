import { expect, test, type BrowserContext } from '@playwright/test';
import { readFile } from 'node:fs/promises';

async function fixture(context: BrowserContext, failExport = false) {
  await context.route('https://embed.tawk.to/**', route => route.fulfill({body:''}));
  await context.addCookies([{name:'belivrhq_token',value:'giving-download-fixture',url:'http://127.0.0.1:3107'}]);
  await context.addInitScript(({failExport}) => {
    const original=window.fetch.bind(window);
    const calls: string[]=[];
    (window as unknown as {downloadCalls:string[]}).downloadCalls=calls;
    window.fetch=async(input,options)=>{
      const url=new URL(input instanceof Request?input.url:String(input),location.origin);
      if(!url.pathname.startsWith('/api/'))return original(input,options);
      calls.push(url.pathname+url.search);
      if(url.pathname==='/api/session')return Response.json({hasSession:true});
      let data:unknown={data:[],total:0,meta:{total:0,page:1,limit:20,totalPages:1}};
      if(url.pathname.endsWith('/profiles/me')) data={profileId:'p',userId:'u',churchId:'c',branchId:'branch-a',role:['church_admin'],status:'active',isAdminHq:false,firstName:'Admin',lastName:'Test',church:{churchId:'c',name:'Grace Church'},branch:{branchId:'branch-a',name:'West Branch'},planFeatures:['giving','reports'],permissions:['giving:reports:read','giving:records:read','giving:records:create','giving:categories:read','attendance:services:read','members:read']};
      else if(url.pathname.endsWith('/giving/transactions')){
        const page=Number(url.searchParams.get('page')||1),limit=Number(url.searchParams.get('limit')||15);
        if(failExport&&limit===100)return Response.json({success:false,error:{message:'Export page unavailable'}},{status:503});
        const all=Array.from({length:205},(_,i)=>({transactionId:`tx-${i}`,churchId:'c',branchId:'branch-a',branchName:'West Branch',memberId:`member-${i}`,memberName:`Member ${i}`,categoryId:'cat',categoryName:'Offering',amount:1250.50,currency:'USD',type:'digital',status:'success',paymentGateway:'flutterwave',paymentMethod:'card',paymentReference:`PAY-${i}`,receiptNumber:`2026/OFF/${i}`,givingDate:'2026-10-01',createdAt:'2026-10-23T16:30:00Z',updatedAt:'2026-10-23T16:30:00Z'}));
        data={data:all.slice((page-1)*limit,page*limit),total:205,meta:{page,limit,total:205,totalPages:Math.ceil(205/limit)}};
      }else if(url.pathname.endsWith('/giving/categories'))data={data:[{categoryId:'cat',name:'Offering',isActive:true}],total:1};
      else if(/\/members(?:\/search)?$/.test(url.pathname))data={data:[{memberId:'member-uuid-a',firstName:'Ada',lastName:'Okafor',branchId:'branch-a',email:'ada@example.org'}],total:1};
      return Response.json({success:true,data});
    };
  },{failExport});
}

test('giving member selection retains the name after closing the picker',async({page,context})=>{
  await fixture(context);
  await page.goto('/giving/records');
  await page.getByRole('button',{name:'Record Giving',exact:true}).click();
  const dialog=page.getByRole('dialog');
  await dialog.getByRole('button',{name:'Member',exact:true}).click();
  await dialog.getByRole('button',{name:'Search members by name...',exact:true}).click();
  await page.getByRole('option',{name:/Ada Okafor/}).click();
  await expect(dialog.getByRole('button',{name:'Ada Okafor',exact:true})).toBeVisible();
  await expect(dialog.getByText('member-uuid-a',{exact:true})).toHaveCount(0);
});

test('giving CSV downloads every filtered page with complete receipt data',async({page,context})=>{
  await fixture(context);
  await page.goto('/giving/records');
  await expect(page.getByText('Member 0',{exact:true}).first()).toBeVisible();
  await page.getByRole('button',{name:'Export',exact:true}).first().click();
  const downloading=page.waitForEvent('download');
  await page.getByRole('menuitem',{name:'Export as CSV',exact:true}).click();
  const download=await downloading;
  const csv=await readFile((await download.path())!,'utf8');
  expect(csv.trim().split('\n')).toHaveLength(206);
  for(const value of ['Giving Date','Recorded At (UTC)','Payment Reference','2026-10-01','2026-10-23T16:30:00Z','West Branch','Member 204','PAY-204','USD','1250.5'])expect(csv).toContain(value);
  const calls=await page.evaluate(()=>(window as unknown as {downloadCalls:string[]}).downloadCalls);
  expect(calls.some(path=>path.includes('page=3')&&path.includes('limit=100')&&path.includes('branchId=branch-a'))).toBe(true);
});

test('a failed full download does not silently export the visible page',async({page,context})=>{
  await fixture(context,true);
  const downloads:string[]=[];page.on('download',download=>downloads.push(download.suggestedFilename()));
  await page.goto('/giving/records');
  await expect(page.getByText('Member 0',{exact:true}).first()).toBeVisible();
  await page.getByRole('button',{name:'Export',exact:true}).first().click();
  await page.getByRole('menuitem',{name:'Export as CSV',exact:true}).click();
  await expect(page.getByText('CSV export failed',{exact:true})).toBeVisible();
  expect(downloads).toEqual([]);
});

test('oversized giving reports keep date filters available so the user can narrow the result',async({page,context})=>{
  await fixture(context);
  await context.addInitScript(()=>{
    const previous=window.fetch.bind(window);
    window.fetch=async(input,options)=>{
      const url=new URL(input instanceof Request?input.url:String(input),location.origin);
      if(url.pathname.endsWith('/giving/transactions')&&!url.searchParams.get('startDate'))return Response.json({success:true,data:{data:[],total:5001}});
      return previous(input,options);
    };
  });
  await page.goto('/giving/reports');
  await expect(page.getByText(/More than 5,000 records match/)).toBeVisible();
  await page.getByLabel('Start date',{exact:true}).fill('2026-10-01');
  await expect(page.getByText('Failed to load giving reports.',{exact:true})).toHaveCount(0);
  await expect(page.getByRole('combobox',{name:'Giving report currency',exact:true})).toContainText('USD');
});
