import type {AssetLoan,AssetMaintenance} from "@/hooks/use-assets";
import {formatStatusLabel} from "@/lib/status-label";
export interface AssetActivity {id:string;kind:"loan"|"maintenance";date:string;title:string;description:string;person?:string;status:string;due?:string;}
export function assetActivity(loans:AssetLoan[],maintenance:AssetMaintenance[]):AssetActivity[]{
 const items:AssetActivity[]=[];
 for(const loan of loans){items.push({id:`loan:${loan.id}`,kind:"loan",date:loan.loanDate,title:"Loan issued",description:loan.notes||"Asset checked out to its borrower.",person:loan.borrowerName,status:loan.status,due:loan.expectedReturnDate});if(loan.actualReturnDate)items.push({id:`return:${loan.id}`,kind:"loan",date:loan.actualReturnDate,title:"Asset returned",description:loan.conditionAfter?`Returned in ${formatStatusLabel(loan.conditionAfter).toLowerCase()} condition.`:"The asset was checked back in.",person:loan.borrowerName,status:"returned"});}
 for(const record of maintenance){items.push({id:`scheduled:${record.id}`,kind:"maintenance",date:record.scheduledDate,title:`${formatStatusLabel(record.type)} scheduled`,description:record.description||record.notes||"Maintenance recorded for this asset.",person:record.performedBy,status:record.status,due:record.scheduledDate});if(record.completedDate)items.push({id:`completed:${record.id}`,kind:"maintenance",date:record.completedDate,title:`${formatStatusLabel(record.type)} completed`,description:record.notes||record.description||"Maintenance completed.",person:record.performedBy,status:"completed"});}
 return items.sort((a,b)=>(Date.parse(b.date)||0)-(Date.parse(a.date)||0)||a.id.localeCompare(b.id));
}
