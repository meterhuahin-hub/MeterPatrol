import com.google.zxing.BarcodeFormat;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.oned.Code128Writer;
import com.google.zxing.oned.ITFWriter;
import com.google.zxing.qrcode.QRCodeWriter;
import th.meterhuahin.meterpatrol.BarcodeDecoder;
import java.util.Arrays;

public class BarcodeDecoderTest {
    private static byte[] pixels(BitMatrix matrix) {
        byte[] data = new byte[matrix.getWidth() * matrix.getHeight()];
        Arrays.fill(data, (byte)255);
        for (int y=0; y<matrix.getHeight(); y++) for (int x=0; x<matrix.getWidth(); x++)
            if (matrix.get(x,y)) data[y*matrix.getWidth()+x]=0;
        return data;
    }
    private static void expect(String expected, String actual) {
        if (expected==null ? actual!=null : !expected.equals(actual))
            throw new AssertionError("Expected " + expected + ", got " + actual);
    }
    public static void main(String[] args) throws Exception {
        BarcodeDecoder decoder=new BarcodeDecoder();
        for (String pea : new String[]{"5800771852","0019096189","6700132502"}) {
            BitMatrix matrix=new Code128Writer().encode(pea,BarcodeFormat.CODE_128,720,280);
            byte[] data=pixels(matrix);
            expect(pea,decoder.decode(data,720,280));
            byte[] rotated=new byte[data.length];
            for(int y=0;y<280;y++)for(int x=0;x<720;x++)rotated[x*280+279-y]=data[y*720+x];
            expect(pea,decoder.decode(rotated,280,720));
        }
        BitMatrix itf=new ITFWriter().encode("0019096189",BarcodeFormat.ITF,720,280);
        expect("0019096189",decoder.decode(pixels(itf),720,280));
        BitMatrix text=new Code128Writer().encode("ABC123",BarcodeFormat.CODE_128,720,280);
        expect(null,decoder.decode(pixels(text),720,280));
        BitMatrix qr=new QRCodeWriter().encode("5800771852",BarcodeFormat.QR_CODE,280,280);
        expect(null,decoder.decode(pixels(qr),280,280));
        byte[] blank=new byte[720*280];Arrays.fill(blank,(byte)255);
        expect(null,decoder.decode(blank,720,280));expect(null,decoder.decode(new byte[1],720,280));
        System.out.println("PASS native ZXing decoder: CODE128, ITF, portrait/landscape, leading zeroes, rejection of text/QR/blank/invalid frames");
    }
}
