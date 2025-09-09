import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { ConfigProvider, Tabs, Typography } from "antd";
import FullMatrix from "./FullMatrix";
import SingleCompat from "./SingleCompat";
import TokenManager from "./TokenManager";

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
        <ConfigProvider>
            <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: asyncStoragePersister }}>
                <Typography.Title>GeoStyler Compatibility Matrix</Typography.Title>

                <Tabs
                    items={[
                        {
                            key: "1",
                            label: "Single library compatibility",
                            children: <SingleCompat />,
                        },
                        {
                            key: "2",
                            label: "Compatibility matrix",
                            children: <FullMatrix />,
                        },
                    ]}
                />

                <TokenManager />

                <ReactQueryDevtools initialIsOpen={false} />
            </PersistQueryClientProvider>
        </ConfigProvider>
    );
}

export default App;
