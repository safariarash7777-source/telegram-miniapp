import express from 'express';
import rateLimit from 'express-rate-limit';
import {getTelegramSessionFromRequest} from './telegram-session';
import {provePlatformConnection} from './platform-connection';
export const platformConnectionRouter=express.Router();
platformConnectionRouter.use(rateLimit({windowMs:60000,limit:10,standardHeaders:true,legacyHeaders:false}));
platformConnectionRouter.post('/prove',async(req,res)=>{
 res.setHeader('cache-control','private, no-store');
 if(process.env.NEXT09_ENABLED!=='true')return res.status(503).json({error:'اتصال فعال نشده است.'});
 const origin=process.env.MINI_APP_URL||process.env.VITE_APP_URL;
 let configuredOrigin:string;try{configuredOrigin=new URL(origin||'').origin;}catch{return res.status(503).json({error:'اتصال پیکربندی نشده است.'});}
 if(req.header('origin')!==configuredOrigin)return res.status(403).json({error:'مبدأ درخواست معتبر نیست.'});
 const session=await getTelegramSessionFromRequest(req);if(!session)return res.status(401).json({error:'مینی‌اپ را از تلگرام باز کنید.'});
 if(!req.body||Object.keys(req.body).join(',')!=='token'||typeof req.body.token!=='string')return res.status(422).json({error:'کد اتصال معتبر نیست.'});
 try{return res.json(await provePlatformConnection(req.body.token.trim().replace(/^\/link /,''),session.telegramId));}catch{return res.status(503).json({error:'اتصال انجام نشد؛ کد تازه از سایت بگیرید.'});}
});
