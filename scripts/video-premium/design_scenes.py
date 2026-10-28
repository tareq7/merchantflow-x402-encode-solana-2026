import os
from pathlib import Path
import math,json
import numpy as np
from PIL import Image,ImageDraw,ImageFont,ImageFilter,ImageOps
P=Path(os.environ.get('SELLERPILOT_VIDEO_WORKDIR',Path(__file__).resolve().parent)).resolve()
W,H=1920,1080
S=P/'raw'
OUT=P/'design'
OUT.mkdir(exist_ok=True)
manifest=json.loads((P/'scene-manifest.json').read_text())
fontdir='/usr/share/fonts/truetype/dejavu'
def font(n,heavy=False):return ImageFont.truetype(fontdir+('/DejaVuSans-Bold.ttf' if heavy else '/DejaVuSans.ttf'),n)
def col(h):return tuple(int(h[j:j+2],16) for j in [1,3,5])
BG='#071923';GLOW='#43e4c8';ORANGE='#ffbb82';BLUE='#83caff';WHITE='#e9f6f4';SECOND='#92afaf'
slides=[
('intro','START WITH A BETTER DECISION','7× ROAS ISN’T THE WHOLE STORY',None,'THE COST OF MISSING INVENTORY',GLOW),
('ui','THE PROBLEM','Your ad budget deserves context.','01-command-center','An online store. Two marketplaces. Too many disconnected decisions.',GLOW),
('ui','STRONG RESULTS','A great ROAS can hide a risk.','08-campaigns','High advertising returns are only one part of a good decision.',BLUE),
('ui','THE BLIND SPOT','Advertising and stock rarely agree.','04-radar','Look beyond the return on advertising spend.',ORANGE),
('risk','STOCKOUT RISK','10 days of stock. 30 days to restock.','05-evidence','A synthetic example: profitable ads can still create an inventory gap.',ORANGE),
('ui','OUR APPROACH','One clear view of both.','01-command-center','SellerPilot brings advertising results and inventory into focus.',GLOW),
('ui','OPPORTUNITY RADAR','Start with what needs attention.','04-radar','The highest-impact signals come first, with reasons you can inspect.',GLOW),
('focus','EVIDENCE, NOT GUESSES','Every signal has a paper trail.','05-evidence','Inspect SKU, inventory runway, ROAS and supplier lead times.',BLUE),
('focus','WHAT IF?','Test a change before you commit.','07-simulator','Simulated spend changes are clearly marked as assumptions.',ORANGE),
('ui','THE SIMULATOR','Read the numbers, not a prediction.','07-simulator','A transparent scenario helps explain the trade-offs.',GLOW),
('ui','APPROVAL STUDIO','Nothing changes without you.','09-approval','Review the proposal and evidence before staging an action.',GLOW),
('ui','YOU KEEP CONTROL','Stage it. Export it. Your call.','10-staged','No silent campaign updates, no surprise bids.',BLUE),
('focus','AMAZON DATA','Use your real Sponsored Products CSV.','12-amazon','Import report data with your own costs and explicit VAT treatment.',ORANGE),
('focus','NOON DATA','Map the columns. No assumptions.','13-noon','Noon report formats vary, so every required field is verified.',GLOW),
('ui','DATA YOU CAN TRUST','Know when something is missing.','11-data-quality','Quality checks block decisions when stock or costs are incomplete.',BLUE),
('ui','BUILT IN TWO LANGUAGES','Arabic and English. Fully supported.','14-arabic-radar','Right-to-left layouts without sacrificing the underlying evidence.',GLOW),
('meta','MUSE SPARK 1.3','Reasoning over verified calculations.','04-radar','Meta Contributor tested on synthetic data; app model API remains gated.',BLUE),
('outro','SELLERPILOT AI','SEE THE RISK. MAKE THE CALL.','16-home-end','sellerpilot-ai-phi.vercel.app',GLOW)
]
assert len(slides)==18
def gradient(accent=GLOW):
 y,x=np.mgrid[:H,:W]
 glow=np.maximum(0,1-np.sqrt(((x-1460)/1350)**2+((y-90)/950)**2))
 left=np.maximum(0,1-np.sqrt(((x-70)/950)**2+((y-1050)/750)**2))
 rgb=np.array(col(accent),dtype=np.float32)
 base=np.zeros((H,W,3),dtype=np.float32)
 for i,c in enumerate([6,19,28]):base[:,:,i]=c+glow*(rgb[i]*.090)+left*(rgb[i]*.028)
 return Image.fromarray(np.uint8(np.clip(base,0,255)),'RGB')
def glow_ellipse(img,bbox,fill,blur=48):
 layer=Image.new('RGBA',(W,H));d=ImageDraw.Draw(layer)
 d.ellipse(bbox,fill=(*col(fill),65))
 return Image.alpha_composite(img.convert('RGBA'),layer.filter(ImageFilter.GaussianBlur(blur)))
def t(draw,xy,txt,sz,color=WHITE,bold=True,spacing=0):
 draw.text(xy,txt,font=font(sz,bold),fill=col(color),spacing=spacing)
def rounded(img,bbox,radius,fill,outline=None,width=1):
 ImageDraw.Draw(img).rounded_rectangle(bbox,radius=radius,fill=fill,outline=outline,width=width)
def base_frame(accent):
 img=gradient(accent).convert('RGBA')
 d=ImageDraw.Draw(img)
 # Fine editorial grid, studio lighting and nonintrusive indicators.
 for x in range(0,W,128):d.line((x,0,x,H),fill=(66,100,113,15),width=1)
 for y in range(0,H,128):d.line((0,y,W,y),fill=(66,100,113,14),width=1)
 d.line((62,89,1858,89),fill=(73,112,118,100),width=2)
 return img
def chromeline(img,index,accent):
 d=ImageDraw.Draw(img)
 t(d,(65,25),'SELLERPILOT',32,WHITE)
 t(d,(291,31),'AI',23,accent)
 t(d,(1596,33),f'{index:02d}  /  18',20,SECOND)
 d.line((62,89,62+int(1796*index/18),89),fill=col(accent),width=4)
def screenshot(img,png,mode='ui',accent=GLOW):
 src=Image.open(S/(png+'.png')).convert('RGB')
 if mode=='focus':
  # Crop decorative side navigation, enlarge actionable central application.
  source=src.crop((240,35,1920,925))
  x,y,w,h=55,133,1810,838
 else:
  source=src
  x,y,w,h=45,135,1830,846
 crop=ImageOps.fit(source,(w,h),Image.Resampling.LANCZOS,centering=(.5,.48))
 # Wide studio monitor, screenshot itself fills nearly entire 1080p frame.
 shadow=Image.new('RGBA',(W,H))
 sd=ImageDraw.Draw(shadow)
 sd.rounded_rectangle((x-5,y-1,x+w+5,y+h+16),radius=28,fill=(0,0,0,188))
 img.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(23)))
 image=Image.new('RGBA',(w,h),(0,0,0,0))
 image.paste(crop)
 m=Image.new('L',(w,h));ImageDraw.Draw(m).rounded_rectangle((0,0,w-1,h-1),radius=17,fill=255)
 img.alpha_composite(Image.composite(image,Image.new('RGBA',(w,h)),m),(x,y))
 d=ImageDraw.Draw(img)
 d.rounded_rectangle((x-1,y-1,x+w+1,y+h+1),radius=18,outline=(97,154,153,215),width=2)
 d.line((x+27,y+8,x+w-27,y+8),fill=(*col(accent),155),width=3)
 # Discrete lens-style corner indicators.
 for u,v,sgn in [(x+22,y+21,1),(x+w-22,y+21,-1),(x+22,y+h-22,1),(x+w-22,y+h-22,-1)]:
  d.line((u,v,u+sgn*35,v),fill=col(accent),width=3)
def footer(img,headline,narration,accent,index):
 d=ImageDraw.Draw(img)
 d.rounded_rectangle((42,999,1878,1060),radius=14,fill=(10,31,41,252),outline=(47,91,93,235),width=1)
 d.rounded_rectangle((64,1016,71,1042),radius=3,fill=col(accent))
 # Short notes remain completely outside application screenshot.
 t(d,(91,1012),narration[:109],26,WHITE,bold=False)
 t(d,(1688,1022),'11.ai  •  DEMO',17,SECOND,bold=False)
def make_intro(img,subtitle,accent):
 img=glow_ellipse(img,(750,30,1700,930),accent,80)
 d=ImageDraw.Draw(img)
 t(d,(96,175),'WHEN AN AD',75,WHITE)
 t(d,(96,273),'LOOKS PERFECT...',75,WHITE)
 t(d,(100,394),'7×',189,accent)
 t(d,(474,482),'RETURN ON AD SPEND',36,WHITE)
 t(d,(100,699),'...BUT THE PRODUCT IS RUNNING OUT.',48,WHITE)
 d.rounded_rectangle((1240,372,1772,744),radius=26,fill=(10,38,47,225),outline=(52,119,120),width=3)
 t(d,(1290,424),'STOCK COVER',27,SECOND)
 t(d,(1290,481),'10',113,accent)
 t(d,(1490,541),'DAYS',29,WHITE)
 d.line((1292,632,1710,632),fill=(50,101,109),width=3)
 t(d,(1290,647),'RESTOCKING',26,SECOND)
 t(d,(1570,643),'30 DAYS',33,ORANGE)
 t(d,(102,871),'THE GAP IS THE REAL RISK.',36,ORANGE)
 t(d,(104,935),'ILLUSTRATIVE SCENARIO — NOT LIVE SELLER DATA',20,SECOND,bold=False)
def make_risk(img,png,accent):
 # A large readability-focused infographic, grounded in the synthetic demo.
 src=Image.open(S/(png+'.png')).convert('RGB')
 src=ImageOps.fit(src,(1720,725),Image.Resampling.LANCZOS)
 im=Image.new('RGBA',(W,H))
 im.paste(src,(100,220))
 im=im.filter(ImageFilter.GaussianBlur(10))
 dim=Image.new('RGBA',(W,H),(6,18,29,192))
 img.alpha_composite(im)
 img.alpha_composite(dim)
 d=ImageDraw.Draw(img)
 t(d,(127,176),'A CAMPAIGN CAN LOOK GREAT...',57,WHITE)
 t(d,(135,312),'7× ROAS',124,GLOW)
 d.rounded_rectangle((126,502,866,752),radius=23,fill=(8,38,48,245),outline=(68,139,133),width=2)
 d.rounded_rectangle((910,502,1790,752),radius=23,fill=(8,38,48,245),outline=(178,100,77),width=2)
 t(d,(171,536),'STOCK AVAILABLE',31,SECOND)
 t(d,(184,598),'10 DAYS',80,GLOW)
 t(d,(957,536),'SUPPLIER LEAD TIME',31,SECOND)
 t(d,(972,598),'30 DAYS',80,ORANGE)
 d.line((282,821,1651,821),fill=(69,114,120),width=8)
 d.line((282,821,716,821),fill=col(GLOW),width=16)
 t(d,(471,863),'YOU COULD RUN OUT BEFORE YOU RESTOCK.',37,WHITE)
def make_meta(img,accent):
 d=ImageDraw.Draw(img)
 t(d,(140,184),'GOOD REASONING.',70,WHITE)
 t(d,(140,291),'RELIABLE NUMBERS.',70,accent)
 cards=[
  (115,473,560,752,'01','VERIFIED METRICS','Deterministic financial and stock analysis'),
  (732,473,1177,752,'02','MUSE SPARK','Evidence-grounded explanations'),
  (1348,473,1793,752,'03','SELLER CONTROL','Review, stage, export')
 ]
 for x1,y1,x2,y2,num,name,desc in cards:
  d.rounded_rectangle((x1,y1,x2,y2),radius=26,fill=(12,39,48,230),outline=col(accent),width=2)
  t(d,(x1+32,y1+30),num,44,accent)
  t(d,(x1+32,y1+113),name,27,WHITE)
  # short 2-line descriptor
  split=desc.rfind(' ',0,26) if len(desc)>28 else -1
  if split>0:
   t(d,(x1+32,y1+172),desc[:split],20,SECOND,False)
   t(d,(x1+32,y1+204),desc[split+1:],20,SECOND,False)
  else:t(d,(x1+32,y1+178),desc,18,SECOND,False)
 d.line((561,612,728,612),fill=col(accent),width=5)
 d.line((1178,612,1346,612),fill=col(accent),width=5)
 t(d,(154,855),'Real Meta provider response verified using synthetic data.',28,SECOND,False)
 t(d,(154,905),'Application-side tool calls remain private and gated.',24,SECOND,False)
def make_outro(img,accent):
 img=glow_ellipse(img,(280,100,1640,1000),accent,120)
 d=ImageDraw.Draw(img)
 d.rounded_rectangle((250,196,1668,864),radius=46,fill=(9,36,45,225),outline=(80,160,151),width=3)
 d.rounded_rectangle((315,252,390,327),radius=18,fill=col(accent))
 t(d,(449,256),'SELLERPILOT',67,WHITE)
 t(d,(1050,264),'AI',50,accent)
 d.line((320,400,1597,400),fill=(62,117,116),width=3)
 t(d,(328,499),'SEE THE RISK.',82,WHITE)
 t(d,(328,620),'MAKE THE CALL.',82,accent)
 t(d,(332,778),'sellerpilot-ai-phi.vercel.app',33,SECOND,False)
 t(d,(710,962),'OPEN SOURCE  •  ARABIC + ENGLISH  •  VOICE: 11.ai',21,SECOND,False)
for idx,(kind,label,headline,png,sub,accent) in enumerate(slides,1):
 img=base_frame(accent)
 if kind=='intro':make_intro(img,headline,accent)
 elif kind=='risk':make_risk(img,png,accent)
 elif kind=='meta':make_meta(img,accent)
 elif kind=='outro':make_outro(img,accent)
 else:screenshot(img,png,kind,accent)
 chromeline(img,idx,accent)
 if kind in ('ui','focus'):
  d=ImageDraw.Draw(img)
  # Text over the matte above screen, not over the UI itself.
  t(d,(59,100),label+'   /   '+headline,25,WHITE)
  footer(img,headline,sub,accent,idx)
 else:
  if kind!='outro':footer(img,headline,sub,accent,idx)
  else:footer(img,headline,'A smarter decision before the next riyal.',accent,idx)
 path=OUT/f'{idx:02d}.png'
 img.convert('RGB').save(path,optimize=True)
 print('FRAME',idx,kind,path.stat().st_size,flush=True)
(P/'slides.json').write_text(json.dumps([{'index':i+1,'kind':k,'section':l,'headline':h,'source':p,'caption':s,'accent':c} for i,(k,l,h,p,s,c) in enumerate(slides)],indent=2))
print('ALL_FRAMES_READY',len(slides))
