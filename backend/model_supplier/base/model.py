
class BaseModel:
    def __init__(self, id: str, name: str, abbreviation:str):
        self._id = id
        self._name = name
        self._abbreviation = abbreviation

    def get_id(self):
        return self._id

    def get_name(self):
        return self._name

    def get_abbreviation(self):
        return self._abbreviation

