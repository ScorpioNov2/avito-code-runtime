import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.PrintStream;
import java.io.PrintWriter;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;

/**
 * Chương trình phụ chạy bên trong CheerpJ (hoặc JVM thường khi kiểm thử).
 * Nó biên dịch / chạy code người dùng và ghi kết quả ra file, để JavaScript đọc lại
 * (vì CheerpJ không có API công khai để bắt System.out).
 *
 *   compile <classesDir> <logDir> <sourceFile>   -> javac, ghi stderr.txt + exit.txt
 *   run     <logDir> <mainClass>                 -> chạy main(), ghi stdout.txt, stderr.txt, exit.txt
 */
public class AvitoDriver {
    public static void main(String[] args) throws Exception {
        String mode = args[0];
        if (mode.equals("compile")) {
            compile(args[1], new File(args[2]), args[3]);
        } else if (mode.equals("run")) {
            run(new File(args[1]), args[2]);
        } else {
            throw new IllegalArgumentException("Unknown mode: " + mode);
        }
    }

    private static void compile(String classesDir, File logDir, String sourceFile) throws Exception {
        logDir.mkdirs();
        int exitCode;
        try (PrintWriter diagnostics = new PrintWriter(new OutputStreamWriter(
                new FileOutputStream(new File(logDir, "stderr.txt")), StandardCharsets.UTF_8), true)) {
            // Gọi bằng reflection để không phụ thuộc lúc biên dịch vào module jdk.compiler / tools.jar.
            Class<?> javacMain = Class.forName("com.sun.tools.javac.Main");
            Method compile = javacMain.getMethod("compile", String[].class, PrintWriter.class);
            String[] javacArgs = {"-encoding", "UTF-8", "-d", classesDir, sourceFile};
            exitCode = (Integer) compile.invoke(null, javacArgs, diagnostics);
        }
        writeExitCode(logDir, exitCode);
    }

    private static void run(File logDir, String mainClass) throws Exception {
        logDir.mkdirs();
        PrintStream originalOut = System.out;
        PrintStream originalErr = System.err;
        PrintStream capturedOut = openLog(new File(logDir, "stdout.txt"));
        PrintStream capturedErr = openLog(new File(logDir, "stderr.txt"));
        System.setOut(capturedOut);
        System.setErr(capturedErr);
        // stdin luôn hết dữ liệu: tránh chương trình treo khi gọi Scanner/BufferedReader trên System.in.
        System.setIn(new ByteArrayInputStream(new byte[0]));

        int exitCode = 0;
        try {
            Method main = Class.forName(mainClass).getMethod("main", String[].class);
            main.invoke(null, (Object) new String[0]);
        } catch (InvocationTargetException e) {
            e.getCause().printStackTrace();
            exitCode = 1;
        } catch (ClassNotFoundException | NoSuchMethodException e) {
            System.err.println("Cannot find 'public static void main(String[] args)' in class " + mainClass);
            exitCode = 1;
        } finally {
            capturedOut.flush();
            capturedErr.flush();
            System.setOut(originalOut);
            System.setErr(originalErr);
        }
        writeExitCode(logDir, exitCode);
    }

    private static PrintStream openLog(File file) throws Exception {
        OutputStream stream = new FileOutputStream(file);
        return new PrintStream(stream, true, "UTF-8");
    }

    private static void writeExitCode(File logDir, int exitCode) throws Exception {
        Files.write(new File(logDir, "exit.txt").toPath(), String.valueOf(exitCode).getBytes(StandardCharsets.UTF_8));
    }
}
