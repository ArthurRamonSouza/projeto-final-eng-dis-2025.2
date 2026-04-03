/**
 * Falha após `ms` se a promise não resolver — evita HTTP preso quando Redis/BullMQ não respondem
 * (ex.: `docker stop` no container Redis).
 */
export async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return await Promise.race([
        promise,
        new Promise<never>((_, reject) =>
            setTimeout(
                () => reject(new Error(`withTimeout: exceeded ${ms}ms`)),
                ms,
            ),
        ),
    ]);
}
