# 책 장 표지 그림 30장. 흑백 인쇄에서도 보이도록 색이 아니라 '밝기 차이'로 구분한다.
from base import f, ttext, tlen
from PIL import Image, ImageDraw
import math, os

W, H = 1600, 1000
PAPER=(250,247,241); INK=(26,32,44); SOFT=(120,128,142); FAINT=(226,221,211)
MARKC={'✅':(58,78,74), '🏡':(58,78,74), '🚃':(150,96,66), '📖':(150,146,138)}
MARKT={'✅':'다녀온 곳', '🏡':'살았던 곳', '🚃':'근처까지 갔던 곳', '📖':'아직 안 가본 곳'}

DATA=[
 (1,'쿠사츠','草津温泉','군마','📖','23년 연속 1위'),
 (2,'게로','下呂温泉','기후','📖','일본 3대 명천의 하나'),
 (3,'도고','道後温泉','에히메','🏡','1년을 살았던 곳'),
 (4,'벳푸 8탕','別府八湯','오이타','✅','물이 뜨거웠다'),
 (5,'노보리베츠','登別温泉','홋카이도','✅','눈 내리는 노천탕'),
 (6,'아리마','有馬温泉','효고','✅','기대보다는 떨어졌다'),
 (7,'아와라','あわら温泉','후쿠이','📖','23위에서 7위로'),
 (8,'이부스키','指宿温泉','가고시마','✅','모래에 묻히는 온천'),
 (9,'기노사키','城崎温泉','효고','📖','공동탕 일곱 곳을 돈다'),
 (10,'구로카와','黒川温泉','구마모토','✅','겨울만 아직 못 봤다'),
 (11,'하코네','箱根温泉','가나가와','✅','한 곳에 묵고 안 나왔다'),
 (12,'유후인','由布院温泉','오이타','✅','낮에 실망, 아침에 반전'),
 (13,'와쿠라','和倉温泉','이시카와','📖','바다에서 솟는 온천'),
 (14,'야마시로','山代温泉','이시카와','📖','광장에 공동탕이 두 개'),
 (15,'아타미','熱海温泉','시즈오카','📖','이름이 「뜨거운 바다」'),
 (16,'다마쓰쿠리','玉造温泉','시마네','📖','1300년 전 책에 적힌 물'),
 (17,'쓰키오카','月岡温泉','니가타','📖','석유를 파다 나온 온천'),
 (18,'이카호','伊香保温泉','군마','🚃','같은 시까지 갔는데 못 갔다'),
 (19,'야마나카','山中温泉','이시카와','📖','바쇼가 여드레를 묵었다'),
 (19,'오쿠히다 온천향','奥飛騨温泉郷','기후','📖','마을 다섯이 모인 곳'),
 (21,'우레시노','嬉野温泉','사가','✅','탕보다 족욕이 좋았다'),
 (22,'긴잔','銀山温泉','야마가타','📖','100년 된 나무 여관'),
 (23,'뉴토 온천향','乳頭温泉郷','아키타','✅','유백색, 한 곳만 갔다'),
 (24,'가미스와','上諏訪温泉','나가노','📖','기차역 승강장에 족욕탕'),
 (26,'아키우','秋保温泉','미야기','📖','센다이에서 차로 30분'),
 (26,'히루가미','昼神温泉','나가노','📖','별이 가장 잘 보이는 곳'),
 (28,'우나즈키','宇奈月温泉','도야마','📖','물을 7km 밖에서 끌어온다'),
 (29,'기누가와 · 가와지','鬼怒川・川治温泉','도치기','📖','한 이름, 두 마을'),
 (30,'나가토유모토','長門湯本温泉','야마구치','✅','다시 살아난 마을'),
]

def steam(d, cx, cy, scale=1.0, col=(26,32,44), wmul=1.0):
    """온천 기호의 김 세 줄기"""
    for k,(dx,amp,h) in enumerate([(-90,16,150),(0,20,190),(90,16,150)]):
        pts=[]
        for t in range(0,101):
            y=cy - (h*scale)*t/100.0
            x=cx + dx*scale + (amp*scale)*math.sin(t/100.0*3.0*math.pi + k)
            pts.append((x,y))
        d.line(pts, fill=col, width=int(9*scale*wmul), joint='curve')

def make(i, rank, ko, jp, pref, mark, line):
    im=Image.new('RGB',(W,H),PAPER); d=ImageDraw.Draw(im,'RGBA')
    # 테두리
    d.rectangle([40,40,W-40,H-40], outline=FAINT, width=3)
    d.rectangle([56,56,W-56,H-56], outline=FAINT, width=1)
    # 아주 큰 순위 숫자 (연한 배경)
    rs=str(rank); fo=f(None,520)
    tw=d.textlength(rs,font=fo)
    d.text((W-tw-110, H-700), rs, font=fo, fill=FAINT)
    # 김 모양
    steam(d, 980, 1010, 0.8, (216,211,201), 1.0)
    # 본문
    x=150
    ttext(d,(x,170),f'{rank}위',40,SOFT,False)
    d.line([(x,236),(x+90,236)],fill=INK,width=5)
    ttext(d,(x,290),ko,92,INK,True)
    ttext(d,(x,420),jp,52,SOFT,False)
    ttext(d,(x,500),pref+'현',38,SOFT,False)
    # 마크 띠
    mc=MARKC[mark]; mt=MARKT[mark]
    bw=tlen(d,mt,34,True)+64
    d.rounded_rectangle([x,600,x+bw,668],radius=34,fill=mc)
    ttext(d,(x+32,614),mt,34,(255,255,255),True)
    # 한 줄
    ttext(d,(x,730),line,44,INK,False)
    # 하단
    ttext(d,(x,H-150),'일본 100대 온천 기록 · 제39회(2025)',24,(176,170,160),False)
    # QR (구글 지도)
    try:
        from PIL import Image as _I
        q=_I.open(f'qr/{i:02d}.png').resize((230,230))
        im.paste(q,(W-300,H-330))
        ttext(d,(W-300,H-82),'지도 · 길찾기',22,(150,146,138),False)
    except Exception:
        pass
    name=f'images/{i:02d}_{rank:02d}_{ko.replace(" ","").replace("·","")}.png'
    im.save(name,quality=96)
    return name

os.makedirs('images',exist_ok=True)
files=[make(i+1,*row) for i,row in enumerate(DATA)]
print(len(files),'장 생성')

# 미리보기 한 장 (6 x 5)
cols,rows=5,6; tw,th=W//4,H//4
sheet=Image.new('RGB',(cols*tw+ (cols+1)*16, rows*th + (rows+1)*16),(238,234,226))
for idx,fp in enumerate(files):
    c,r=idx%cols, idx//cols
    sheet.paste(Image.open(fp).resize((tw,th)), (16+c*(tw+16), 16+r*(th+16)))
sheet.save('미리보기_장표지30장.png',quality=92)
print('미리보기 저장')
