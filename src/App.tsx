import './App.css'
import { useEffect, useState } from "react";
import * as dfd from "danfojs";

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [countPhotos, setCountPhotos] = useState(0);
    const [nextPageToken, setNextPageToken] = useState("");
    const [photoData, setPhotoData] = useState(new dfd.DataFrame());

    const handleClick = () => {
        const callbackUrl = `${window.location.origin}`;
        const googleClientId = "858254660756-j340ge20fjuqca7bgl0sgcrk2e26o9ja.apps.googleusercontent.com";
        const scope = "https://www.googleapis.com/auth/photoslibrary.readonly";
        const targetUrl = `https://accounts.google.com/o/oauth2/auth?redirect_uri=${encodeURIComponent(callbackUrl)}&response_type=token&client_id=${googleClientId}&scope=${encodeURIComponent(scope)}`;
        window.location.href = targetUrl;
    };

    const getMorePhotos = async () => {
        const response = await fetch(
            `https://photoslibrary.googleapis.com/v1/mediaItems?pageSize=100&pageToken=${nextPageToken}`,
            {
                headers: {
                    "Authorization": `Bearer ${sessionStorage.getItem("access_token")}`
                }
            }
        );
        const json = await response.json();
        setNextPageToken(json.nextPageToken);

        return json;
    };

    const normalizeJson = (json: { mediaItems: any[]; }) => {
        return json.mediaItems.map((item) => {
            return Object.assign({}, item, item.mediaMetadata, item.mediaMetadata.photo);
        });
    };

    const mergeData = (oldDf: dfd.DataFrame, newDf: dfd.DataFrame) => {
        return dfd.concat({ dfList: [oldDf, newDf], axis: 0 }) as dfd.DataFrame;
    };

    const plotCameraModelStats = (df: dfd.DataFrame) => {
        return df.groupby(["cameraMake", "cameraModel"]).col(["id"]).count().plot("cameraModelStats").table();
        return df.groupby(["cameraMake", "cameraModel"]).col(["id"]).count().plot("cameraModelStats").bar({
            config: {
                x: "cameraMake",
                y: "id_count",
            }
        });
    };

    const plotFocalLengthStats = (df: dfd.DataFrame) => {
        return df.query(df["cameraModel"].eq("ILCE-7CM2")).groupby(["focalLength"]).col(["id"]).count().plot("focalLengthStats").bar({
            config: {
                x: "focalLength",
                y: "id_count",
            }
        });
    };

    const loadMore = async () => {
        const json = await getMorePhotos();
        const normalizedJson = normalizeJson(json);
        let newPhotoData = new dfd.DataFrame(normalizedJson);
        newPhotoData.print();
        if (photoData.size != 0) {
            newPhotoData = mergeData(photoData, newPhotoData);
        }
        setCountPhotos(countPhotos + normalizedJson.length);
        setPhotoData(newPhotoData);
        plotFocalLengthStats(newPhotoData);
        plotCameraModelStats(newPhotoData);
    };

    useEffect(() => {
        const accessTokenRegex = /access_token=([^&]+)/;
        const isMatch = window.location.href.match(accessTokenRegex);

        if (isMatch) {
            const accessToken = isMatch[1];
            sessionStorage.setItem("access_token", accessToken);
            setIsLoggedIn(true);
        }
    });

    return (
        <div className="App">
            {isLoggedIn ? (
                <div>
                    <h1>Logged in</h1>
                    <h2>Last {countPhotos} photos</h2>
                    <button onClick={loadMore}>Load more</button>
                    <div id="cameraModelStats"></div>
                    <div id="focalLengthStats"></div>
                </div>
            ) : (
                <button onClick={handleClick}>Sign in</button>
            )}
        </div>
    );
}

export default App;
