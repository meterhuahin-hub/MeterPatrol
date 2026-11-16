package th.meterhuahin.meterpatrol;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.BinaryBitmap;
import com.google.zxing.DecodeHintType;
import com.google.zxing.MultiFormatReader;
import com.google.zxing.PlanarYUVLuminanceSource;
import com.google.zxing.ReaderException;
import com.google.zxing.common.HybridBinarizer;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.Map;

/** Camera luminance decoding only. No browser, Google Play services, storage or networking. */
public final class BarcodeDecoder {
    private final MultiFormatReader reader = new MultiFormatReader();

    public BarcodeDecoder() {
        Map<DecodeHintType, Object> hints = new EnumMap<>(DecodeHintType.class);
        hints.put(DecodeHintType.POSSIBLE_FORMATS, Arrays.asList(BarcodeFormat.CODE_128,
            BarcodeFormat.CODE_39, BarcodeFormat.CODE_93, BarcodeFormat.ITF,
            BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A,
            BarcodeFormat.UPC_E, BarcodeFormat.CODABAR));
        hints.put(DecodeHintType.TRY_HARDER, Boolean.TRUE);
        reader.setHints(hints);
    }

    public String decode(byte[] luminance, int width, int height) {
        if (width <= 0 || height <= 0 || (long) width * height > luminance.length) return null;
        String value = read(luminance, width, height);
        if (value != null) return value;
        byte[] rotated = new byte[width * height];
        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) rotated[x * height + height - 1 - y] = luminance[y * width + x];
        }
        return read(rotated, height, width);
    }

    private String read(byte[] data, int width, int height) {
        try {
            PlanarYUVLuminanceSource source = new PlanarYUVLuminanceSource(data, width, height, 0, 0, width, height, false);
            String value = reader.decodeWithState(new BinaryBitmap(new HybridBinarizer(source))).getText().trim();
            return value.matches("[0-9]{1,30}") ? value : null;
        } catch (ReaderException | IllegalArgumentException unreadable) {
            return null;
        } finally {
            reader.reset();
        }
    }
}
