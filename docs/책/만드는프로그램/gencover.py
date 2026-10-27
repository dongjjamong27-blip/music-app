# 책 표지 — A5(148x210mm) 300dpi = 1748 x 2480
from base import f, ttext, tlen
from PIL import Image, ImageDraw
import math

W,H=1748,2480
NAVY=(24,32,46); CREAM=(247,243,235); GOLD=(206,170,104); SOFT=(150,160,176)
C_GO=(96,140,132); C_NEAR=(186,122,84); C_NOT=(140,146,158)

def steam(d,cx,cy,sc,col,w):
    for k,(dx,amp,h) in enumerate([(-120,22,420),(0,26,520),(120,22,420)]):
        pts=[]
        for t in range(0,121):
            y=cy-(h*sc)*t/120.0
            x=cx+dx*sc+(amp*sc)*math.sin(t/120.0*3.0*math.pi+k)
            pts.append((x,y))
        d.line(pts,fill=col,width=int(w*sc),joint='curve')

# ── 앞표지 ──
im=Image.new('RGB',(W,H),NAVY); d=ImageDraw.Draw(im,'RGBA')
d.ellipse([-420,H-1100,W+420,H+700],fill=(30,40,56))
steam(d,W//2,H-540,1.25,(255,255,255,26),30)
d.rectangle([90,90,W-90,H-90],outline=(255,255,255,40),width=3)

ttext(d,(0,0),'',10,NAVY)  # 폰트 캐시
t='일본 100대 온천 기록'
ttext(d,((W-tlen(d,t,44,False))/2,300),t,44,SOFT,False)
d.line([(W//2-70,400),(W//2+70,400)],fill=GOLD,width=5)

t1='천천히,'
t2='온천'
ttext(d,((W-tlen(d,t1,170,True))/2,470),t1,170,(255,255,255),True)
ttext(d,((W-tlen(d,t2,170,True))/2,680),t2,170,GOLD,True)

for i,t in enumerate(['안 가본 곳은','안 가봤다고 씁니다']):
    ttext(d,((W-tlen(d,t,54,False))/2,950+i*76),t,54,(214,220,230),False)

# 마크 범례
y=1180; items=[('다녀온 곳',C_GO),('살았던 곳',C_GO),('근처까지',C_NEAR),('아직',C_NOT)]
tot=sum(tlen(d,t,30,False)+74 for t,_ in items)-40
x=(W-tot)/2
for t,c in items:
    d.ellipse([x,y+4,x+26,y+30],fill=c)
    ttext(d,(x+38,y),t,30,(190,200,214),False)
    x+=tlen(d,t,30,False)+74

t='1위부터 30위까지'
ttext(d,((W-tlen(d,t,46,False))/2,H-520),t,46,(214,220,230),False)
t='신용철'
ttext(d,((W-tlen(d,t,56,True))/2,H-390),t,56,(255,255,255),True)
im.save('표지_앞.png',quality=96)

# ── 뒤표지 ──
im=Image.new('RGB',(W,H),CREAM); d=ImageDraw.Draw(im,'RGBA')
d.rectangle([90,90,W-90,H-90],outline=(220,214,202),width=3)
steam(d,W-330,H-300,0.7,(226,220,208),22)

lines=[
 ('"가본 곳은 가봤다고 쓰고,',56,True,NAVY),
 ('안 가본 곳은 안 가봤다고 씁니다."',56,True,NAVY),
 ('',30,False,NAVY),
 ('',30,False,NAVY),
 ('서른 곳 중 제가 실제로 다녀온 곳은 아홉 곳입니다.',38,False,(70,80,96)),
 ('살았던 곳이 한 곳, 근처까지만 간 곳이 한 곳.',38,False,(70,80,96)),
 ('나머지 열아홉 곳은 아직 못 가봤습니다.',38,False,(70,80,96)),
 ('',30,False,NAVY),
 ('그래서 이 책의 절반 이상은 들은 이야기입니다.',38,False,(70,80,96)),
 ('그걸 숨기지 않고 쓴 것이',38,False,(70,80,96)),
 ('이 책에서 제일 중요한 부분이라고 생각합니다.',38,False,(70,80,96)),
]
y=360
for t,sz,b,c in lines:
    if t: ttext(d,(180,y),t,sz,c,b)
    y+=sz+30

d.line([(180,y+60),(W-180,y+60)],fill=(220,214,202),width=2)
y+=130
for t in ['· 온천마다 지도 QR — 찍으면 위치와 길찾기가 열립니다',
          '· 부산에서 어느 공항으로 들어가는지',
          '· 물을 쉬운 말로 — "미끌미끌한 물", "짭짤한 물"',
          '· 1박 2일을 어떻게 보낼지 세 줄로']:
    ttext(d,(180,y),t,36,(100,110,126),False); y+=62

ttext(d,(180,H-330),'일본 100대 온천 기록',34,(150,146,138),False)
ttext(d,(180,H-270),'제39회(2025) 순위 기준',34,(150,146,138),False)
ttext(d,(180,H-180),'신용철',44,NAVY,True)
im.save('표지_뒤.png',quality=96)
print('표지 2장 저장', (W,H))
