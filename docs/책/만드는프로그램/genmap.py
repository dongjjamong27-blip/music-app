# 지역 분포도 — 실제 지도가 아니라 '지역별 배치도'.
# 좌표를 지어내면 틀리니까, 지역 블록으로만 정확하게 보여준다.
from base import f, ttext, tlen
from PIL import Image, ImageDraw

W,H=1600,2560
PAPER=(250,247,241); INK=(26,32,44); SOFT=(120,128,142); FAINT=(224,219,209)
C_GO=(58,78,74); C_NEAR=(150,96,66); C_NOT=(150,146,138)
def mcol(m): return {'✅':C_GO,'🏡':C_GO,'🚃':C_NEAR,'📖':C_NOT}[m]

REGIONS=[
 ('홋카이도',[(5,'노보리베츠','✅')]),
 ('도호쿠',[(22,'긴잔','📖'),(23,'뉴토 온천향','✅'),(26,'아키우','📖')]),
 ('간토',[(1,'쿠사츠','📖'),(11,'하코네','✅'),(18,'이카호','🚃'),(29,'기누가와·가와지','📖')]),
 ('주부 · 호쿠리쿠',[(2,'게로','📖'),(7,'아와라','📖'),(13,'와쿠라','📖'),(14,'야마시로','📖'),
   (15,'아타미','📖'),(17,'쓰키오카','📖'),(19,'야마나카','📖'),(19,'오쿠히다 온천향','📖'),
   (24,'가미스와','📖'),(26,'히루가미','📖'),(28,'우나즈키','📖')]),
 ('간사이',[(6,'아리마','✅'),(9,'기노사키','📖')]),
 ('주고쿠 · 시코쿠',[(3,'도고','🏡'),(16,'다마쓰쿠리','📖'),(30,'나가토유모토','✅')]),
 ('규슈',[(4,'벳푸 8탕','✅'),(8,'이부스키','✅'),(10,'구로카와','✅'),
   (12,'유후인','✅'),(21,'우레시노','✅')]),
]

im=Image.new('RGB',(W,H),PAPER); d=ImageDraw.Draw(im,'RGBA')
d.rectangle([40,40,W-40,H-40],outline=FAINT,width=3)
ttext(d,(110,110),'서른 곳은 어디에 있나',66,INK,True)
ttext(d,(110,210),'북쪽에서 남쪽 순서입니다. 실제 지도가 아니라 지역별 배치도입니다.',32,SOFT,False)

# 범례
lx=110; ly=290
for m,t in [('✅','다녀온 곳'),('🏡','살았던 곳'),('🚃','근처까지'),('📖','아직')]:
    d.ellipse([lx,ly,lx+26,ly+26],fill=mcol(m))
    ttext(d,(lx+40,ly-4),t,28,SOFT,False)
    lx += 60+tlen(d,t,28,False)

y=400
for name, items in REGIONS:
    h = 110 + 56*((len(items)+1)//2)
    d.rounded_rectangle([110,y,W-110,y+h],radius=22,fill=(255,255,255,210),outline=FAINT,width=2)
    d.rounded_rectangle([110,y,122,y+h],radius=6,fill=INK)
    ttext(d,(160,y+26),name,42,INK,True)
    ttext(d,(W-180-tlen(d,f'{len(items)}곳',30,False),y+34),f'{len(items)}곳',30,SOFT,False)
    yy=y+96
    for k,(rank,ko,m) in enumerate(items):
        cx = 180 if k%2==0 else 860
        cy = yy + 56*(k//2)
        d.ellipse([cx,cy+6,cx+22,cy+28],fill=mcol(m))
        ttext(d,(cx+38,cy),f'{rank}위  {ko}',32,INK,False)
    y += h+34

ttext(d,(110,H-130),'일본 100대 온천 기록 · 제39회(2025) 순위 기준',26,(176,170,160),False)
im.save('지역분포도.png',quality=96)
print('지역 분포도 저장', im.size)
