import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import Matrix from "./Matrix";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            gcTime: 1000 * 60 * 60 * 24, // 24 hours
        },
    },
});

const asyncStoragePersister = createAsyncStoragePersister({
    storage: window.localStorage,
});

function App() {
    return (
        <div style={{ padding: 16 }}>
            <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: asyncStoragePersister }}>
                <h1>GeoStyler Compatibility Matrix</h1>
                <Matrix />
                <ReactQueryDevtools initialIsOpen={false} />
            </PersistQueryClientProvider>
        </div>
    );
}

export default App;
