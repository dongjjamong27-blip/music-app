# QR은 '구글 지도 검색' 주소로 만든다.
# 공식 홈페이지 주소를 내가 지어내면 틀린 곳으로 보낼 수 있어서, 검색 주소를 쓴다.
# 지도로 열리면 위치도 보이고 길찾기도 바로 된다.
import qrcode, urllib.parse, os
JP = [(1,'草津温泉'),(2,'下呂温泉'),(3,'道後温泉'),(4,'別府温泉'),(5,'登別温泉'),
 (6,'有馬温泉'),(7,'あわら温泉'),(8,'指宿温泉'),(9,'城崎温泉'),(10,'黒川温泉'),
 (11,'箱根湯本温泉'),(12,'由布院温泉'),(13,'和倉温泉'),(14,'山代温泉'),(15,'熱海温泉'),
 (16,'玉造温泉'),(17,'月岡温泉'),(18,'伊香保温泉'),(19,'山中温泉'),(19,'奥飛騨温泉郷'),
 (21,'嬉野温泉'),(22,'銀山温泉'),(23,'乳頭温泉郷'),(24,'上諏訪温泉'),(26,'秋保温泉'),
 (26,'昼神温泉'),(28,'宇奈月温泉'),(29,'鬼怒川温泉'),(30,'長門湯本温泉')]
os.makedirs('qr',exist_ok=True)
for i,(rank,jp) in enumerate(JP,1):
    url='https://www.google.com/maps/search/?api=1&query='+urllib.parse.quote(jp)
    q=qrcode.QRCode(version=None, box_size=10, border=2,
                    error_correction=qrcode.constants.ERROR_CORRECT_M)
    q.add_data(url); q.make(fit=True)
    q.make_image(fill_color=(26,32,44), back_color=(250,247,241)).save(f'qr/{i:02d}.png')
print(len(JP),'개 QR 생성')
