self.__BUILD_MANIFEST = {
  "__rewrites": {
    "afterFiles": [
      {
        "has": [
          {
            "type": "query",
            "key": "o",
            "value": "(?<orgid>\\d*)"
          },
          {
            "type": "query",
            "key": "p",
            "value": "(?<projectid>\\d*)"
          },
          {
            "type": "query",
            "key": "r",
            "value": "(?<region>[a-z]{2})"
          }
        ],
        "source": "/api/sentry/tunnel(/?)"
      },
      {
        "has": [
          {
            "type": "query",
            "key": "o",
            "value": "(?<orgid>\\d*)"
          },
          {
            "type": "query",
            "key": "p",
            "value": "(?<projectid>\\d*)"
          }
        ],
        "source": "/api/sentry/tunnel(/?)"
      }
    ],
    "beforeFiles": [],
    "fallback": []
  },
  "sortedPages": [
    "/_app",
    "/_error"
  ]
};self.__BUILD_MANIFEST_CB && self.__BUILD_MANIFEST_CB()