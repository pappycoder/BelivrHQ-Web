import {formatRecordDate,formatRecordDateTime} from "@/lib/record-date";
import {timeLabel} from "@/lib/paper/format";
/** Form values remain in API format; review text follows the shared record format. */
export function formatFormReviewValue(value:string,type?:string):string {
 if(!value)return "";
 if(type==="date")return formatRecordDate(value);
 if(type==="datetime-local")return formatRecordDateTime(value);
 if(type==="time")return timeLabel(value);
 return value;
}
