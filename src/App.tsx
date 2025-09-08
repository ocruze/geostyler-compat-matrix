import { QueryClient } from "@tanstack/query-core";
import Matrix from "./Matrix";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

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
                <h2>GeoStyler Compatibility Matrix</h2>
                <Matrix />
                <ReactQueryDevtools initialIsOpen={false} />
            </PersistQueryClientProvider>
        </div>
    );
}

export default App;
