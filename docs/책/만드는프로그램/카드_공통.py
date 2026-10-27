# 블로그/헬로톡 카드 공통 틀
# 이 컨테이너에는 나눔 글꼴이 없어서 한글·한자를 모두 가진 글꼴 하나로 그린다.
# 굵은 글씨는 테두리(stroke)를 줘서 흉내낸다.
from PIL import Image, ImageDraw, ImageFont
import math
W, H = 1200, 675
FONT = '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc'
BOLD, REG = 'B', 'R'
_fc = {}
def f(name, size):
    if size not in _fc:
        _fc[size] = ImageFont.truetype(FONT, size, index=0)
    return _fc[size]
CREAM=(250,246,238); INK=(29,38,54); INK_SOFT=(92,104,122); MILK=(238,236,230)
ACCENT=(198,106,74); TEAL=(94,134,128); GOLD=(191,150,73); LINE=(221,213,200)
def _sw(size, bold):
    return max(1, round(size/26)) if bold else 0
def bg_light():
    im=Image.new('RGB',(W,H),CREAM); d=ImageDraw.Draw(im,'RGBA')
    for i in range(7):
        x=120+i*160
        d.line([(x+26*math.sin(y/55.0+i),y) for y in range(0,H,6)],fill=(94,134,128,16),width=26)
    return im
def bg_dark():
    im=Image.new('RGB',(W,H),(26,34,48)); d=ImageDraw.Draw(im,'RGBA')
    for i in range(7):
        x=90+i*165
        d.line([(x+30*math.sin(y/50.0+i),y) for y in range(0,H,6)],fill=(255,255,255,12),width=30)
    return im
def card(d,box,fill=(255,255,255,235),radius=26,outline=None):
    d.rounded_rectangle(box,radius=radius,fill=fill,outline=outline,width=2 if outline else 0)
def tlen(d,t,size,bold=True):
    return d.textlength(t,font=f(None,size)) + _sw(size,bold)*2
def ttext(d,xy,t,size,fill,bold=True):
    sw=_sw(size,bold)
    d.text((xy[0]+sw,xy[1]),t,font=f(None,size),fill=fill,
           stroke_width=sw,stroke_fill=fill)
def tctr(d,t,size,y,fill,bold=True,w=None):
    w=w or W
    ttext(d,((w-tlen(d,t,size,bold))/2,y),t,size,fill,bold)
def badge(d,x,y,text,bg=ACCENT,fg=(255,255,255),size=26,pad=(18,9)):
    tw=tlen(d,text,size,True)
    d.rounded_rectangle([x,y,x+tw+pad[0]*2,y+size+pad[1]*2],radius=(size+pad[1]*2)//2,fill=bg)
    ttext(d,(x+pad[0],y+pad[1]-1),text,size,fg,True)
def footer(d,dark=False):
    c=(150,160,175) if dark else (168,160,148)
    t='일본 100대 온천 기록  ·  제39회(2025) 순위 기준'
    ttext(d,(W-tlen(d,t,20,False)-44,H-42),t,20,c,False)
